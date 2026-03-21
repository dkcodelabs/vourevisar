import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function uploadPdfToGemini(apiKey: string, pdfUrl: string): Promise<string> {
  const fileName = pdfUrl.split('/').pop() || `edital-${Date.now()}.pdf`;
  
  console.log('[uploadPdf] Downloading from:', pdfUrl);
  const downloadRes = await fetch(pdfUrl);
  if (!downloadRes.ok) throw new Error(`Falha ao baixar PDF do storage: ${downloadRes.status} - URL: ${pdfUrl}`);
  const arrayBuffer = await downloadRes.arrayBuffer();
  const fileBytes = new Uint8Array(arrayBuffer);
  console.log('[uploadPdf] Downloaded:', fileBytes.length, 'bytes');

  if (fileBytes.length < 100) {
    throw new Error(`PDF muito pequeno (${fileBytes.length} bytes). Possível erro de upload.`);
  }

  const uploadRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Command': 'start, upload, finalize',
        'X-Goog-Upload-Header-Content-Length': String(fileBytes.length),
        'X-Goog-Upload-Header-Content-Type': 'application/pdf',
        'Content-Type': 'application/pdf',
        'X-Goog-Upload-File-Name': fileName,
      },
      body: fileBytes,
    }
  );

  const responseText = await uploadRes.text();
  console.log('[uploadPdf] Gemini upload response:', uploadRes.status, responseText.substring(0, 500));

  if (!uploadRes.ok) {
    throw new Error(`Upload PDF falhou (${uploadRes.status}): ${responseText}`);
  }

  let uploadData: any;
  try {
    uploadData = JSON.parse(responseText);
  } catch {
    throw new Error(`Resposta inválida do Gemini upload: ${responseText.substring(0, 200)}`);
  }

  const fileUri = uploadData.file?.uri || uploadData.name;
  if (!fileUri) {
    throw new Error(`Upload retornou sem URI. Resposta: ${JSON.stringify(uploadData).substring(0, 300)}`);
  }

  console.log('[uploadPdf] Success! fileUri:', fileUri);
  return fileUri;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const authHeader = req.headers.get('Authorization');
    const { data: { user } } = await supabaseClient.auth.getUser(authHeader?.replace('Bearer ', '') ?? '');
    if (!user) throw new Error('Unauthorized');

    const reqData = await req.json();
    const { inputText, pdfUrl, origin, position, year } = reqData;
    
    console.log('[extract-edital] Received request:', {
      hasInputText: !!inputText,
      inputTextLength: inputText?.length || 0,
      inputTextPreview: inputText?.substring(0, 200) || 'EMPTY',
      hasPdfUrl: !!pdfUrl,
      origin,
      position,
      year
    });
    
    const { data: systemSetting } = await supabaseClient.from('system_settings').select('value').eq('key', 'ai_edital_config').single();
    const config = (systemSetting?.value || {}) as any;
    console.log('[extract-edital] Config:', { modelName: config.model || "gemini-1.5-flash", temperature: config.temperature, max_tokens: config.max_tokens });

    const modelName = config.model || "gemini-1.5-flash";
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY não configurada nos secrets da Edge Function.');

    let fileUri: string | null = null;
    if (pdfUrl) {
      console.log('[extract-edital] Uploading PDF to Gemini...');
      fileUri = await uploadPdfToGemini(apiKey, pdfUrl);
      console.log('[extract-edital] PDF uploaded, fileUri:', fileUri);
    } else if (!inputText) {
      console.log('[extract-edital] No PDF or text provided');
    }

    // For PDFs, use high max_tokens — Gemini only uses what it needs (cost = actual usage, not limit)
    const maxTokens = fileUri ? 65536 : (config.max_tokens ?? 16384);

    const context = `${origin || ''} ${position || ''} ${year || ''}`.trim();
    const hasContent = inputText && inputText.trim().length > 0;
    const hasPdf = !!fileUri;

    const baseInstruction = `Você é um especialista em extrair estrutura de editais de concursos públicos brasileiros.

${hasPdf ? 'O PDF do edital está anexado. Leia TODO o conteúdo do PDF.' : ''}
${hasContent ? `\nTEXTO COPIADO DO EDITAL:\n${inputText}` : ''}

CONHECIMENTO DO EDITAL:
Instituição: ${origin || 'Não informada'}
Cargo: ${position || 'Não informado'}
Ano: ${year || 'Não informado'}

SUA TAREFA:
1. Leia TODO o documento/PDF anexado.
2. Procure especificamente pela seção de "CONTEÚDO PROGRAMÁTICO", "PROGRAMA DO CURSO", "MATÉRIAS", "EMENTA" ou seção similar.
3. Extraia TODAS as matérias/disciplinas e seus respectivos tópicos/assuntos listados.

REGRAS OBRIGATÓRIAS:
1. Responda APENAS com JSON válido e minificado. Sem markdown, sem texto fora do JSON.
2. Se encontrar matérias, retorne: {"s":[{"t":"Nome da Matéria","p":[{"n":"Tópico 1"},{"n":"Tópico 2"}]}]}
3. Se NÃO encontrar nenhuma matéria no documento, retorne: {"erro":"Não foram encontradas matérias no texto"}
4. Extraia EXATAMENTE o que está no edital — não invente nem omita tópicos.
5. Cada matéria deve ter pelo menos 1 tópico.
6. Nunca responda com texto explicativo fora do JSON.`;

    let contents: any[];
    if (fileUri) {
      contents = [{ role: "user", parts: [
        { text: baseInstruction },
        { fileData: { mimeType: "application/pdf", fileUri } }
      ]}];
    } else {
      contents = [{ role: "user", parts: [{ text: baseInstruction }] }];
    }

    const payload = {
      contents,
      generationConfig: {
        temperature: config.temperature ?? 0.1,
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json"
      }
    };

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    console.log('[extract-edital] Gemini API response status:', res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[extract-edital] Gemini API error:', res.status, errorText);
      return new Response(JSON.stringify({ error: `Gemini API erro ${res.status}: ${errorText.substring(0, 500)}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400
      });
    }

    const result = await res.json();
    
    const finishReason = result.candidates?.[0]?.finishReason;
    const usage = result.usageMetadata;
    console.log('[extract-edital] Gemini response:', {
      status: res.status,
      finishReason,
      promptTokens: usage?.promptTokenCount,
      candidatesTokens: usage?.candidatesTokenCount,
      totalTokens: usage?.totalTokenCount,
      resultPreview: JSON.stringify(result).substring(0, 500)
    });

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error.message || JSON.stringify(result.error) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400
      });
    }

    let text = result.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
    console.log('[extract-edital] Extracted text before clean:', text.substring(0, 300));

    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    console.log('[extract-edital] Final extracted text:', text);

    return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400
    });
  }
});
