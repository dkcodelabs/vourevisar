import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_CONTINUE_ATTEMPTS = 3;

async function callGemini(apiKey: string, modelName: string, payload: any): Promise<{ text: string; finishReason: string; usage: any }> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API erro ${res.status}: ${errorText.substring(0, 500)}`);
  }

  const result = await res.json();
  
  if (result.error) {
    throw new Error(result.error.message || JSON.stringify(result.error));
  }

  const finishReason = result.candidates?.[0]?.finishReason || 'UNKNOWN';
  const usage = result.usageMetadata;
  const text = result.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';

  console.log('[callGemini]', { finishReason, promptTokens: usage?.promptTokenCount, candidatesTokens: usage?.candidatesTokenCount });
  return { text, finishReason, usage };
}

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

    // Use gemini-2.0-flash for PDFs (no thinking tokens = more output capacity)
    const modelName = fileUri ? 'gemini-2.0-flash' : (config.model || "gemini-1.5-flash");
    const maxTokens = fileUri ? 32768 : (config.max_tokens ?? 16384);

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

    // First call
    console.log('[extract-edital] Calling Gemini API...');
    let { text, finishReason, usage } = await callGemini(apiKey, modelName, payload);
    console.log('[extract-edital] First call done:', { finishReason, textLength: text.length });

    // Continue loop if MAX_TOKENS
    let continueAttempts = 0;
    while (finishReason === 'MAX_TOKENS' && continueAttempts < MAX_CONTINUE_ATTEMPTS) {
      continueAttempts++;
      console.log(`[extract-edital] Response truncated, continuing (attempt ${continueAttempts}/${MAX_CONTINUE_ATTEMPTS})...`);

      // Find last complete topic/subject to tell Gemini where we stopped
      const lastTopicMatch = text.match(/"n":"[^"]{0,50}"\}\]?\}\]?$/);
      const lastPoint = lastTopicMatch ? lastTopicMatch[0] : text.slice(-80);

      const continuePayload = {
        contents: [
          ...contents,
          { role: "model", parts: [{ text }] },
          { role: "user", parts: [{ text: `O JSON foi cortado. Último ponto gerado terminou com: ...${lastPoint}

Continue a extração a partir desse ponto. Retorne APENAS o restante do array de matérias (objetos {"t":"...","p":[...]}) que faltam. Não repita nada que já foi gerado. Não inclua {"s":[ no início.` }] }
        ],
        generationConfig: {
          temperature: config.temperature ?? 0.1,
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json"
        }
      };

      const continueResult = await callGemini(apiKey, modelName, continuePayload);
      finishReason = continueResult.finishReason;

      let continuation = continueResult.text.trim();
      console.log('[extract-edital] Continuation received, length:', continuation.length);

      // Clean continuation: remove markdown, find JSON start
      continuation = continuation.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

      // Try to extract array items from continuation
      // It might start with [{"t":... or {"t":... or just "t":...
      let items = '';
      const arrayMatch = continuation.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) {
        items = arrayMatch[0];
      } else {
        // Maybe it's just one or more objects without array wrapper
        const objMatch = continuation.match(/\{[\s\S]*\}/);
        if (objMatch) {
          items = `[${objMatch[0]}]`;
        } else {
          items = continuation;
        }
      }

      // Clean first part: ensure it ends properly for concatenation
      let firstPart = text;
      // Remove incomplete trailing object (might end with partial "n":"...)
      const lastCompleteBracket = firstPart.lastIndexOf('}]');
      if (lastCompleteBracket > 0) {
        // Find the subject object that contains this bracket
        const beforeBracket = firstPart.substring(0, lastCompleteBracket + 2);
        // Close the subject object if needed
        if (!beforeBracket.endsWith('}]}'  )) {
          firstPart = beforeBracket + '}';
        } else {
          firstPart = beforeBracket;
        }
      }

      // Remove trailing }]}" or similar
      firstPart = firstPart.replace(/,?\s*\}?\s*\]?\s*\}?\s*$/, '');

      // Combine
      text = firstPart + ',' + items.replace(/^\[/, '').replace(/\]$/, '');
      console.log('[extract-edital] Merged result length:', text.length);
    }

    if (continueAttempts > 0) {
      console.log('[extract-edital] Completed with', continueAttempts, 'continue attempts');
      // Ensure JSON is properly closed
      text = text.replace(/,?\s*$/, ''); // Remove trailing comma
      // Count open brackets and close them
      const openBraces = (text.match(/\{/g) || []).length;
      const closeBraces = (text.match(/\}/g) || []).length;
      const openArrays = (text.match(/\[/g) || []).length;
      const closeArrays = (text.match(/\]/g) || []).length;
      for (let i = 0; i < openBraces - closeBraces; i++) text += '}';
      for (let i = 0; i < openArrays - closeArrays; i++) text += ']';
    }

    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    console.log('[extract-edital] Final extracted text:', text.substring(0, 300));

    return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400
    });
  }
});
