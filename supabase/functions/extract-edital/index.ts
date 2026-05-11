import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ExtractMode = "analyze" | "extractForCargo";

const DEFAULT_ANALYSIS_PROMPT = `Voce e um especialista em editais de concursos publicos brasileiros.
Analise o edital fornecido e identifique metadados e cargos disponiveis.

Regras:
- Leia o documento inteiro antes de responder.
- Identifique o nome do concurso/edital, orgao/instituicao, ano, banca e data de prova quando estiverem explicitamente no documento.
- Extraia todos os cargos, funcoes, especialidades ou areas quando houver mais de um.
- Se o edital tiver cargo unico, retorne uma lista com um unico cargo.
- Nao invente dados. Use null quando nao houver evidencia.
- O campo evidence deve conter um trecho curto do edital que justifique o cargo.

Retorne APENAS JSON valido no formato:
{
  "edital": {
    "name": "string",
    "organ": "string|null",
    "year": "string|null",
    "examDate": "YYYY-MM-DD|null",
    "banca": "string|null"
  },
  "cargos": [
    {
      "id": "cargo-1",
      "name": "Nome limpo do cargo",
      "rawLabel": "Texto original do edital",
      "evidence": "Trecho curto usado como evidencia"
    }
  ]
}`;

const DEFAULT_EXTRACTION_PROMPT = `Voce e um especialista em estruturar conteudo programatico de editais de concursos publicos brasileiros.
Extraia disciplinas, topicos e pesos SOMENTE para o cargo selecionado.

Regras criticas:
- Cargo selecionado: "{{selectedCargo}}".
- Se houver secoes por cargo, extraia apenas o conteudo desse cargo.
- Se o edital tiver cargo unico, extraia o conteudo programatico disponivel.
- Ignore macrogrupos como Conhecimentos Gerais, Conhecimentos Basicos, Conhecimentos Especificos quando eles forem apenas agrupadores.
- Cada disciplina real deve virar um item em subjects.
- Preserve a ordem original das disciplinas e topicos.
- Separe topicos atomicos por numeracao (1, 1.1, 1.2), ponto e virgula ou itens claros.
- Preserve numeracao original no inicio do topico quando existir.
- Extraia pesos quando houver tabela de prova, numero de questoes, pontos, peso ou percentual por disciplina.
- Se o peso nao estiver claro para uma disciplina, use null nos campos de weight.
- Nao inclua bibliografia, avisos administrativos ou regras de inscricao como topicos.
- Nao invente materias, topicos, datas ou pesos.

Retorne APENAS JSON valido no formato:
{
  "edital": {
    "name": "string",
    "organ": "string|null",
    "year": "string|null",
    "examDate": "YYYY-MM-DD|null",
    "banca": "string|null"
  },
  "selectedCargo": "string",
  "subjects": [
    {
      "title": "Nome da disciplina",
      "weight": {
        "points": 0,
        "questions": 0,
        "percentage": 0,
        "rawText": "trecho do edital|null"
      },
      "topics": [
        { "name": "Topico", "position": 0 }
      ]
    }
  ],
  "warnings": []
}`;

const WEIGHT_EXTRACTION_RULES = `REGRAS OBRIGATORIAS PARA PESO / IMPORTANCIA:
- "Peso" nao depende da palavra peso aparecer no edital.
- Sempre procure tabelas de prova com colunas como "Quantidade de questoes", "Valor de cada questao", "Pontuacao maxima", "Pontos", "Total" ou equivalentes.
- Se a tabela informar quantidade de questoes por disciplina, preencha weight.questions.
- Se a tabela informar pontuacao maxima por disciplina, preencha weight.points.
- Se a prova totalizar 100 pontos ou 100 questoes, use tambem weight.percentage igual a participacao daquela disciplina no total.
- Exemplo: 17 questoes de 100 e pontuacao maxima 17,00 => questions: 17, points: 17, percentage: 17.
- Se uma disciplina tiver mais questoes/pontos que outra, ela tem maior peso pratico, mesmo sem a palavra "peso".
- O campo weight.rawText deve conter o trecho/tabela que justifica os numeros.
- So use null se nao houver tabela ou evidencia clara para aquela disciplina.`;

async function callGemini(apiKey: string, modelName: string, payload: any, timeoutMs = 90000): Promise<{ text: string; finishReason: string; usage: any }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Connection": "keep-alive",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini API erro ${res.status}: ${errorText.substring(0, 500)}`);
    }

    const result = await res.json();
    if (result.error) throw new Error(result.error.message || JSON.stringify(result.error));

    const finishReason = result.candidates?.[0]?.finishReason || "UNKNOWN";
    const usage = result.usageMetadata;
    const text = result.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";

    console.log("[callGemini]", {
      modelName,
      finishReason,
      promptTokens: usage?.promptTokenCount,
      candidatesTokens: usage?.candidatesTokenCount,
    });

    return { text, finishReason, usage };
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("Timeout: A API do Gemini demorou muito para responder.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableGeminiError(error: any) {
  const message = String(error?.message || error || "");
  return (
    message.includes("Gemini API erro 429") ||
    message.includes("Gemini API erro 500") ||
    message.includes("Gemini API erro 502") ||
    message.includes("Gemini API erro 503") ||
    message.includes("Gemini API erro 504") ||
    message.includes("UNAVAILABLE") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("high demand") ||
    message.includes("Timeout:")
  );
}

function uniqueModels(models: string[]) {
  return [...new Set(models.map((model) => model.trim()).filter(Boolean))];
}

function getModelCandidates(config: any, primaryModel: string) {
  const configuredFallbacks = Array.isArray(config.fallback_models) ? config.fallback_models : [];
  return uniqueModels([
    primaryModel,
    ...configuredFallbacks,
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
  ]);
}

function getMaxOutputTokensForModel(modelName: string, requestedMaxTokens: number) {
  if (modelName.includes("2.0") || modelName.includes("1.5")) {
    return Math.min(requestedMaxTokens, 8192);
  }
  return Math.min(requestedMaxTokens, 65536);
}

async function callGeminiWithFallbacks(
  apiKey: string,
  modelCandidates: string[],
  payloadFactory: (modelName: string) => any,
  timeoutMs: number,
  attemptsPerModel = 1,
): Promise<{ text: string; finishReason: string; usage: any; modelName: string }> {
  let lastError: any = null;

  for (const modelName of modelCandidates) {
    for (let attempt = 1; attempt <= attemptsPerModel; attempt++) {
      try {
        const result = await callGemini(apiKey, modelName, payloadFactory(modelName), timeoutMs);
        return { ...result, modelName };
      } catch (error: any) {
        lastError = error;
        if (!isRetryableGeminiError(error)) {
          throw error;
        }

        console.warn("[extract-edital] Gemini retryable error", {
          modelName,
          attempt,
          message: error?.message,
        });

        if (attempt < attemptsPerModel) {
          await sleep(1200 * attempt);
        }
      }
    }
  }

  throw lastError || new Error("A API do Gemini esta indisponivel no momento.");
}

async function uploadPdfBytesToGemini(apiKey: string, fileBytes: Uint8Array, fileName: string): Promise<string> {
  if (fileBytes.length < 100) throw new Error(`PDF muito pequeno (${fileBytes.length} bytes).`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const uploadRes = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
      method: "POST",
      headers: {
        "X-Goog-Upload-Command": "start, upload, finalize",
        "X-Goog-Upload-Header-Content-Length": String(fileBytes.length),
        "X-Goog-Upload-Header-Content-Type": "application/pdf",
        "Content-Type": "application/pdf",
        "X-Goog-Upload-File-Name": fileName,
        "Connection": "keep-alive",
      },
      body: fileBytes,
      signal: controller.signal,
    });

    const responseText = await uploadRes.text();
    if (!uploadRes.ok) throw new Error(`Upload PDF falhou (${uploadRes.status}): ${responseText}`);

    const uploadData = JSON.parse(responseText);
    const activeFile = await waitForGeminiFileActive(apiKey, uploadData.file);
    const fileUri = activeFile?.uri || uploadData.file?.uri || uploadData.name;
    if (!fileUri) throw new Error(`Upload retornou sem URI.`);
    return fileUri;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("Timeout: O upload do PDF para o Gemini demorou muito.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function waitForGeminiFileActive(apiKey: string, file: any): Promise<any> {
  if (!file?.name) return file;
  if (!file.state || file.state === "ACTIVE") return file;

  const startedAt = Date.now();
  let currentFile = file;

  while (currentFile?.state === "PROCESSING" && Date.now() - startedAt < 45000) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${currentFile.name}?key=${apiKey}`);
    const text = await res.text();
    if (!res.ok) throw new Error(`Falha ao consultar processamento do PDF (${res.status}): ${text}`);
    const parsed = JSON.parse(text);
    currentFile = parsed.file || parsed;
  }

  if (currentFile?.state === "FAILED") {
    throw new Error("O Gemini falhou ao processar o PDF enviado.");
  }

  if (currentFile?.state && currentFile.state !== "ACTIVE") {
    throw new Error("O Gemini ainda esta processando o PDF. Tente novamente em alguns segundos.");
  }

  return currentFile;
}

async function uploadPdfUrlToGemini(apiKey: string, pdfUrl: string): Promise<string> {
  const fileName = pdfUrl.split("/").pop() || `edital-${Date.now()}.pdf`;
  const downloadRes = await fetch(pdfUrl);
  if (!downloadRes.ok) throw new Error(`Falha ao baixar PDF do storage: ${downloadRes.status}`);

  const arrayBuffer = await downloadRes.arrayBuffer();
  return uploadPdfBytesToGemini(apiKey, new Uint8Array(arrayBuffer), fileName);
}

async function uploadStoragePdfToGemini(supabaseClient: any, apiKey: string, pdfPath: string, userId: string): Promise<string> {
  if (!pdfPath.startsWith(`${userId}/`)) {
    throw new Error("PDF fora da pasta do usuario autenticado.");
  }

  const { data, error } = await supabaseClient.storage
    .from("temporary_editais")
    .download(pdfPath);

  if (error || !data) {
    throw new Error(`Falha ao baixar PDF do storage: ${error?.message || "arquivo nao encontrado"}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return uploadPdfBytesToGemini(apiKey, new Uint8Array(arrayBuffer), pdfPath.split("/").pop() || `edital-${Date.now()}.pdf`);
}

function stripJsonText(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseJsonObject(text: string): any {
  const clean = stripJsonText(text);
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("A IA retornou uma resposta sem JSON valido.");
    return JSON.parse(match[0]);
  }
}

function normalizeDate(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const match = value.match(/(\d{2})[\/.-](\d{2})[\/.-](\d{4})/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function normalizeAnalysis(raw: any) {
  const edital = raw?.edital || {};
  const cargos = Array.isArray(raw?.cargos) ? raw.cargos : [];

  const normalizedCargos = cargos
    .map((cargo: any, index: number) => ({
      id: String(cargo?.id || `cargo-${index + 1}`),
      name: String(cargo?.name || cargo?.rawLabel || "").trim(),
      rawLabel: String(cargo?.rawLabel || cargo?.name || "").trim(),
      evidence: String(cargo?.evidence || "").trim(),
    }))
    .filter((cargo: any) => cargo.name.length > 0);

  return {
    edital: {
      name: String(edital?.name || "Edital analisado por IA").trim(),
      organ: edital?.organ ? String(edital.organ).trim() : null,
      year: edital?.year ? String(edital.year).trim() : null,
      examDate: normalizeDate(edital?.examDate),
      banca: edital?.banca ? String(edital.banca).trim() : null,
    },
    cargos: normalizedCargos.length > 0
      ? normalizedCargos
      : [{ id: "cargo-1", name: "Cargo unico", rawLabel: "Cargo unico", evidence: "" }],
  };
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(",", ".").replace(/[^\d.-]/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeExtraction(raw: any, selectedCargo: string) {
  const edital = raw?.edital || {};
  const subjects = Array.isArray(raw?.subjects) ? raw.subjects : [];

  return {
    edital: {
      name: String(edital?.name || "Edital importado por IA").trim(),
      organ: edital?.organ ? String(edital.organ).trim() : null,
      year: edital?.year ? String(edital.year).trim() : null,
      examDate: normalizeDate(edital?.examDate),
      banca: edital?.banca ? String(edital.banca).trim() : null,
    },
    selectedCargo: String(raw?.selectedCargo || selectedCargo || "").trim(),
    subjects: subjects
      .map((subject: any) => {
        const weight = subject?.weight || {};
        const topics = Array.isArray(subject?.topics) ? subject.topics : [];
        return {
          title: String(subject?.title || subject?.name || "").trim(),
          weight: {
            points: normalizeNumber(weight.points),
            questions: normalizeNumber(weight.questions),
            percentage: normalizeNumber(weight.percentage),
            rawText: weight.rawText ? String(weight.rawText).trim() : null,
          },
          topics: topics
            .map((topic: any, index: number) => ({
              name: String(typeof topic === "string" ? topic : topic?.name || "").replace(/\s+/g, " ").trim(),
              position: normalizeNumber(topic?.position) ?? index,
            }))
            .filter((topic: any) => topic.name.length >= 2),
        };
      })
      .filter((subject: any) => subject.title.length > 0 && subject.topics.length > 0),
    warnings: Array.isArray(raw?.warnings) ? raw.warnings.map((w: any) => String(w)) : [],
  };
}

function buildContents(instruction: string, inputText?: string, fileUri?: string | null) {
  const parts: any[] = [{ text: `${instruction}\n\n${inputText ? `TEXTO DO EDITAL:\n${inputText}` : "Leia o PDF anexado integralmente."}` }];
  if (fileUri) {
    parts.push({ file_data: { mime_type: "application/pdf", file_uri: fileUri } });
  }
  return [{ role: "user", parts }];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    const { data: { user } } = await supabaseClient.auth.getUser(authHeader?.replace("Bearer ", "") ?? "");
    if (!user) throw new Error("Unauthorized");

    const reqData = await req.json();
    const mode: ExtractMode = reqData.mode || (reqData.position ? "extractForCargo" : "analyze");
    const { inputText, pdfUrl, pdfPath, pdfFileUri, selectedCargo, analysis } = reqData;

    if (!inputText && !pdfUrl && !pdfPath && !pdfFileUri) {
      throw new Error("Forneca um arquivo PDF ou o texto do edital.");
    }

    const { data: systemSetting } = await supabaseClient
      .from("system_settings")
      .select("value")
      .eq("key", "ai_edital_config")
      .maybeSingle();

    const config = (systemSetting?.value || {}) as any;
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY nao configurada nos secrets da Edge Function.");

    let fileUri: string | null = null;
    if (pdfFileUri) {
      fileUri = String(pdfFileUri);
    } else if (pdfPath) {
      fileUri = await uploadStoragePdfToGemini(supabaseClient, apiKey, pdfPath, user.id);
    } else if (pdfUrl) {
      fileUri = await uploadPdfUrlToGemini(apiKey, pdfUrl);
    }

    const primaryModelName = config.model || "gemini-2.5-flash";
    const modelCandidates = getModelCandidates(config, primaryModelName);
    const maxTokens = config.max_tokens || (mode === "analyze" ? 8192 : 32768);
    const prompt =
      mode === "analyze"
        ? (config.analysis_prompt || config.ai_analysis_prompt || DEFAULT_ANALYSIS_PROMPT)
        : `${(config.extraction_prompt || config.ai_extraction_prompt || config.system_prompt || DEFAULT_EXTRACTION_PROMPT)
            .replace(/{{selectedCargo}}/g, selectedCargo || reqData.position || "")}

${WEIGHT_EXTRACTION_RULES}`;

    const contextInstruction = mode === "extractForCargo" && analysis
      ? `${prompt}\n\nDADOS JA IDENTIFICADOS NA ETAPA ANTERIOR:\n${JSON.stringify(analysis)}`
      : prompt;

    const buildPayload = (modelName: string) => ({
      contents: buildContents(contextInstruction, inputText, fileUri),
      generationConfig: {
        temperature: config.temperature !== undefined ? config.temperature : 0.1,
        topK: config.top_k,
        topP: config.top_p,
        presencePenalty: config.presence_penalty,
        maxOutputTokens: getMaxOutputTokensForModel(modelName, maxTokens),
        responseMimeType: "application/json",
      },
    });

    console.log("[extract-edital] Calling Gemini", { mode, modelCandidates, hasPdf: !!fileUri, hasText: !!inputText });
    const timeoutMs = mode === "extractForCargo" ? 85000 : 70000;
    const { text, finishReason, usage, modelName } = await callGeminiWithFallbacks(apiKey, modelCandidates, buildPayload, timeoutMs, 1);

    if (finishReason === "MAX_TOKENS") {
      throw new Error("A resposta da IA foi cortada por limite de tokens. Tente enviar apenas a parte do conteudo programatico ou reduzir o edital.");
    }

    const parsed = parseJsonObject(text);

    if (mode === "analyze") {
      return new Response(JSON.stringify({
        success: true,
        mode,
        analysis: normalizeAnalysis(parsed),
        usage,
        modelName,
        pdfFileUri: fileUri,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      success: true,
      mode,
      extraction: normalizeExtraction(parsed, selectedCargo || reqData.position || ""),
      usage,
      modelName,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[extract-edital] error:", error?.message || error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
