import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
// Use official Google GenAI SDK approach or HTTP fetch. For Edge, HTTP fetch directly to Google API is often safest/easiest.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Using service_role to read system_settings bypass RLS
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const reqData = await req.json();
    const { inputText, pdfBase64, origin, position, year } = reqData;

    // Fetch AI config
    const { data: systemSetting, error: settingError } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'ai_edital_config')
      .single();

    if (settingError) {
      throw new Error(`Error fetching config: ${settingError.message}`);
    }

    const config = systemSetting.value as {
      model: string;
      temperature: number;
      top_p?: number;
      top_k?: number;
      presence_penalty?: number;
      max_tokens: number;
      system_prompt: string;
    };

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY environment variable');
    }

    let contents = [];
    const promptContext = `Contexto adicional:\n- Instituição/Órgão: ${origin}\n- Cargo: ${position}\n- Ano: ${year}\n\nAnalise o seguinte conteúdo:\n`;

    if (pdfBase64) {
      contents = [
        {
          role: "user",
          parts: [
            { text: promptContext },
            { 
              inlineData: {
                mimeType: "application/pdf",
                data: pdfBase64 
              }
            }
          ]
        }
      ];
    } else if (inputText) {
      contents = [
        {
          role: "user",
          parts: [
            { text: promptContext + inputText }
          ]
        }
      ];
    } else {
      throw new Error('Either inputText or pdfBase64 must be provided');
    }

    const modelName = config.model || "gemini-2.5-flash";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const schemaDefinition = {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING", description: "O nome exato da Disciplina ou Matéria" },
          topics: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING", description: "O nome do tópico / assunto dentro da matéria" }
              },
              required: ["name"]
            }
          }
        },
        required: ["title", "topics"]
      }
    };

    console.log(`[Extract] Processing text: ${inputText?.length || 0} characters`);
    
    const strictRules = `
    REGRAS DE OURO:
    1. EXTRAÇÃO COMPLETA: Extraia TODAS as matérias e TODOS os tópicos. Não resuma. Não pule nada.
    2. HIERARQUIA: Transforme numerações complexas (1.1, 1.2.1) em lista linear simples.
    3. FORMATO: JSON estrito com campos 'nome' e 'topicos'.
    4. PERSISTÊNCIA: Continue extraindo até o final absoluto do texto fornecido.
    `;

    const geminiPayload = {
      systemInstruction: {
        parts: [{ text: (config.system_prompt || '') + "\n\n" + strictRules }]
      },
      contents: contents,
      generationConfig: {
        temperature: Number(config.temperature ?? 0.0),
        topP: Number(config.top_p ?? 1.0),
        topK: Number(config.top_k ?? 1),
        presencePenalty: Number(config.presence_penalty ?? 0.0),
        maxOutputTokens: Number(config.max_tokens ?? 8192),
        responseMimeType: "application/json",
        responseSchema: schemaDefinition
      }
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(geminiPayload)
    });

    const geminiData = await response.json();

    if (!response.ok) {
      console.error(geminiData);
      throw new Error(geminiData.error?.message || 'Error calling Gemini API');
    }

    let textResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      console.error(geminiData);
      throw new Error('No structured response returned from Gemini.');
    }

    // Try to strip markdown JSON blocks
    textResponse = textResponse.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');

    let parsedResult;
    try {
      parsedResult = JSON.parse(textResponse);
    } catch (e) {
      console.error("JSON parse failed. Tentando recuperar JSON cortado...");
      try {
        // Encontra o último delimitador válido ( } ou ] )
        const lastBracket = Math.max(textResponse.lastIndexOf('}'), textResponse.lastIndexOf(']'));
        if (lastBracket > 0) {
          let repaired = textResponse.substring(0, lastBracket + 1);
          
          // Balanceador de parênteses/chaves recursivo
          const stack: string[] = [];
          for (let i = 0; i < repaired.length; i++) {
            const char = repaired[i];
            if (char === '{') stack.push('{');
            else if (char === '[') stack.push('[');
            else if (char === '}') { if (stack[stack.length - 1] === '{') stack.pop(); }
            else if (char === ']') { if (stack[stack.length - 1] === '[') stack.pop(); }
          }
          
          while (stack.length > 0) {
            const open = stack.pop();
            if (open === '{') repaired += '}';
            if (open === '[') repaired += ']';
          }
          
          parsedResult = JSON.parse(repaired);
          console.log("JSON cortado recuperado com sucesso via balanceamento!");
        } else {
          throw e;
        }
      } catch (recoveryError) {
        console.error("Falha Crítica na recuperação. Texto original:", textResponse.substring(0, 100));
        throw new Error(`A resposta da IA foi interrompida e está muito quebrada para ser salva (Limite de Tokens). Tente importar partes menores do edital. Raw: ${textResponse.substring(0, 50)}...`);
      }
    }

    return new Response(JSON.stringify({ result: parsedResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Edge Function Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
