import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import cebraspeProfile from "../_shared/bank-profiles/cebraspe.json" assert { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ExtractMode = "analyze" | "extractForCargo";
type BankProfile = {
  banca: string;
  aliases: string[];
  instrucao_para_ia?: string;
  [key: string]: unknown;
};

const BANK_PROFILES: BankProfile[] = [cebraspeProfile as BankProfile];

const DEFAULT_ANALYSIS_PROMPT = `Voce e um extrator de dados automatizado especializado em editais de concursos publicos. Sua tarefa e ler o documento fornecido e identificar a banca organizadora e os cargos ofertados.

Regras:
- Seja adaptativo: se o edital oferecer apenas UM cargo, retorne apenas ele. Se oferecer multiplos cargos, areas, enfases ou especialidades, liste cada variacao como um item separado.
- Opcoes reais do aluno sao apenas cargo, area, enfase ou especialidade. Nao trate perfil, bloco, trilha, P1, P2 ou similares como cargo/opcao.
- Ignore nivel de escolaridade, salarios, cronogramas e regras administrativas.
- Identifique a banca organizadora quando ela aparecer explicitamente no documento. Exemplos: Cebraspe, Cespe, FGV, FCC, Vunesp, AOCP.
- Se a banca nao aparecer explicitamente, use null. Nao chute a banca pelo estilo do edital.
- Identifique o orgao/instituicao, ano do edital/concurso e data da prova quando estiverem explicitamente no documento.
- Para data da prova, retorne null se ela nao estiver no edital. Nao invente data.
- Se um cargo nao tiver area, enfase ou especialidade especifica, deixe area_codigo e area_enfase como null.
- Nao invente cargos, areas, enfases ou especialidades.
- Use tabelas de vagas, provas, criterios de avaliacao ou classificacao apenas para confirmar que opcoes existem. Nao use essas tabelas para criar nomes que nao estejam identificados em secoes oficiais de cargo, area, enfase, especialidade, requisito ou conteudo programatico.
- BLOCO I, BLOCO II, BLOCO III, P1, P2 e similares sao agrupadores internos de conteudo. Eles nao sao cargos, areas, enfases ou especialidades e nao devem virar opcoes no modal.
- A area pode ser rotulada por codigo, como "Area 8", e por enfase, como "Tecnologia da Informacao". Se ambos existirem, mantenha os dois separados.
- O campo label_exibicao deve ser o texto mais claro para o aluno escolher no modal, combinando cargo + area_codigo + area_enfase quando existirem.
- Retorne ESTRITAMENTE JSON puro, sem markdown e sem texto adicional.

Formato JSON esperado:
{
  "concurso": "Nome do Orgao/Concurso",
  "orgao": "Nome do orgao/instituicao ou null",
  "ano": "Ano do edital/concurso ou null",
  "data_prova": "YYYY-MM-DD ou null",
  "banca": "Nome da banca ou null",
  "cargos": [
    {
      "id": 1,
      "nome_cargo": "Nome do Cargo Identificado",
      "area_codigo": "Area 8 ou null",
      "area_enfase": "Nome da Area/Enfase/Especialidade ou null",
      "label_exibicao": "Nome claro para o aluno escolher"
    }
  ]
}`;

const DEFAULT_EXTRACTION_PROMPT = `Voce e um assistente de estruturacao de dados. Sua tarefa e extrair o conteudo programatico, materias e topicos, de um edital de concurso, focado EXCLUSIVAMENTE nos parametros do cargo alvo fornecido.

Dados do Cargo Alvo:
- Nome do Cargo: "{{selectedCargoName}}"
- Area/Enfase: "{{selectedCargoArea}}"

Regras de Extracao:
- Mapeamento flexivel: se o edital tiver apenas um cargo ou nao separar os conteudos, extraia todo o programa de provas disponivel.
- Se houver separacao por cargo, area, enfase ou especialidade, busque os Conhecimentos Basicos comuns ao cargo e os Conhecimentos Especificos vinculados EXATAMENTE ao Nome do Cargo e Area/Enfase.
- Ignore qualquer conteudo de conhecimentos especificos pertencente a outros cargos, areas, enfases ou especialidades.
- Se a Area/Enfase selecionada contiver um codigo como "Area 8", localize exatamente o bloco de conteudo dessa area em Conhecimentos Especificos e extraia apenas ate o inicio da proxima area, proxima enfase, proxima especialidade ou proximo cargo. Nao misture materias de outras areas do mesmo cargo.
- Se nao encontrar o bloco especifico exato da Area/Enfase selecionada, retorne os Conhecimentos Basicos aplicaveis e deixe os Conhecimentos Especificos vazios; nao preencha com conteudo de area parecida.
- Use apenas a parte de conteudo programatico, objetos de avaliacao ou conhecimentos como fonte de materias e topicos.
- Ignore requisitos, diploma, registro profissional, salarios, vagas, cronograma, lotacao, inscricoes e regras administrativas.
- Atomicidade: quebre paragrafos longos em topicos curtos e diretos. Exemplo: em vez de "Direito Civil: Bens, Posse, Propriedade", crie tres topicos separados.
- Preserve a numeracao original no inicio de cada topico quando ela existir no edital. Exemplo: "6 Deduplicacao. ILM - Information Lifecycle Management".
- Quando houver agrupadores como "BLOCO I", "BLOCO II", "P1" ou "P2" antes de uma lista numerada, trate-os apenas como agrupadores. Nao coloque "BLOCO I:" junto do nome do primeiro topico.
- Preserve a ordem original das disciplinas e dos topicos.
- O campo tipo deve marcar claramente a origem da disciplina: "Conhecimentos Basicos", "Conhecimentos Especificos" ou "Geral".
- Nao extraia peso nesta etapa.
- Retorne ESTRITAMENTE JSON puro, sem markdown e sem explicacoes.

Formato JSON esperado:
{
  "cargo_alvo": "Nome do Cargo - Area se houver",
  "conteudo": [
    {
      "tipo": "Conhecimentos Basicos ou Especificos ou Geral se nao houver divisao",
      "disciplina": "Nome da Disciplina",
      "topicos": [
        "1 Topico atomico com numeracao original quando houver",
        "2 Proximo topico apenas quando iniciar a proxima numeracao"
      ]
    }
  ]
}`;

const WEIGHT_EXTRACTION_DISABLED_RULES = `PESO / IMPORTANCIA:
- Nao calcule peso nesta etapa.
- Nao procure tabela de prova para tentar inferir peso agora.
- Para todas as disciplinas, retorne weight.points, weight.questions, weight.percentage e weight.rawText como null.
- O peso sera tratado em uma etapa propria depois, normalmente a partir de quantidade de questoes ou pontuacao por materia.`;

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

function normalizeSearchText(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchesBankProfile(profile: BankProfile, inputText?: string, analysis?: any) {
  const haystack = normalizeSearchText([
    analysis?.edital?.banca,
    analysis?.banca,
    analysis?.edital?.name,
    analysis?.edital?.organ,
    inputText ? inputText.slice(0, 80000) : "",
  ].filter(Boolean).join(" "));

  return profile.aliases.some((alias) => {
    const normalizedAlias = normalizeSearchText(alias);
    return normalizedAlias.length >= 4 && haystack.includes(normalizedAlias);
  });
}

function buildBankProfileInstruction(mode: ExtractMode, inputText?: string, analysis?: any) {
  const matchedProfiles = BANK_PROFILES.filter((profile) => matchesBankProfile(profile, inputText, analysis));
  if (!matchedProfiles.length) return "";

  const instructions = matchedProfiles
    .map((profile) => JSON.stringify(profile, null, 2))
    .join("\n\n");

  return `\n\nPERFIL DA BANCA PARA GUIAR A IA:
Use o perfil abaixo como regra de leitura estrutural. O perfil nao substitui o edital: se nao houver evidencia no edital, nao invente. Quando a extracao der errado, o ajuste deve ser feito neste perfil, nao com regra especifica de edital no codigo.
${instructions}`;
}

function withBankProfileInstruction(basePrompt: string, mode: ExtractMode, inputText?: string, analysis?: any) {
  return `${basePrompt}${buildBankProfileInstruction(mode, inputText, analysis)}`;
}

function getCargoOptionText(cargo: any) {
  return [
    cargo?.id,
    cargo?.name,
    cargo?.label_exibicao,
    cargo?.nome_cargo,
    cargo?.area_codigo,
    cargo?.area_enfase,
    cargo?.rawLabel,
  ].filter(Boolean).join(" ");
}

function extractAreaCode(value: unknown) {
  const normalized = normalizeSearchText(value);
  const match = normalized.match(/\barea\s*(\d+)\b/);
  return match ? `area ${match[1]}` : null;
}

function findSelectedCargo(analysis: any, selectedCargo: string, selectedCargoId?: string) {
  if (!Array.isArray(analysis?.cargos)) return null;

  const selectedId = String(selectedCargoId || "").trim();
  if (selectedId) {
    const byId = analysis.cargos.find((cargo: any) => String(cargo?.id || "").trim() === selectedId);
    if (byId) return byId;
  }

  const selectedText = normalizeSearchText(selectedCargo);
  const selectedAreaCode = extractAreaCode(selectedCargo);
  if (!selectedText) return null;

  let best: { cargo: any; score: number } | null = null;

  for (const cargo of analysis.cargos) {
    const optionText = normalizeSearchText(getCargoOptionText(cargo));
    if (!optionText) continue;

    const cargoAreaCode = extractAreaCode(getCargoOptionText(cargo));
    if (selectedAreaCode && cargoAreaCode !== selectedAreaCode) {
      continue;
    }

    let score = 0;
    if (optionText === selectedText) score += 1000;
    if (optionText.includes(selectedText)) score += 500;
    if (selectedText.includes(optionText)) score += cargoAreaCode ? 300 : 10;
    if (cargo?.area_codigo || cargo?.area_enfase) score += 100;
    score += Math.min(optionText.length, 200) / 10;

    if (score > 0 && (!best || score > best.score)) {
      best = { cargo, score };
    }
  }

  return best?.cargo || null;
}

function buildSelectedOptionContext(analysis: any, selectedCargo: string, selectedCargoId?: string) {
  if (!analysis) return "";
  const selected = findSelectedCargo(analysis, selectedCargo, selectedCargoId);

  return [
    `Edital identificado: ${analysis?.edital?.name || "nao identificado"}`,
    `Orgao: ${analysis?.edital?.organ || "nao identificado"}`,
    `Banca: ${analysis?.edital?.banca || "nao identificada"}`,
    `Opcao selecionada: ${selected?.label_exibicao || selected?.name || selectedCargo}`,
    selected?.nome_cargo ? `Nome do cargo: ${selected.nome_cargo}` : "",
    selected?.area_codigo ? `Codigo da area: ${selected.area_codigo}` : "",
    selected?.area_enfase ? `Area/enfase/especialidade: ${selected.area_enfase}` : "",
    selected?.rawLabel ? `Rotulo original da opcao: ${selected.rawLabel}` : "",
    selected?.evidence ? `Evidencia da opcao: ${selected.evidence}` : "",
  ].filter(Boolean).join("\n");
}

function getSelectedCargoParts(analysis: any, selectedCargo: string, selectedCargoId?: string) {
  const selected = findSelectedCargo(analysis, selectedCargo, selectedCargoId);
  return {
    name: String(selected?.nome_cargo || selected?.name || selectedCargo || "").trim(),
    area: [selected?.area_codigo, selected?.area_enfase].filter(Boolean).join(" - ") || "null",
  };
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
  const concurso = raw?.concurso ? String(raw.concurso).trim() : "";
  const banca = raw?.banca ? String(raw.banca).trim() : "";
  const orgao = raw?.orgao ? String(raw.orgao).trim() : "";
  const ano = raw?.ano ? String(raw.ano).trim() : "";

  const normalizedCargos = cargos
    .map((cargo: any, index: number) => {
      const nomeCargo = cargo?.nome_cargo ? String(cargo.nome_cargo).trim() : "";
      const areaCodigo = cargo?.area_codigo ? String(cargo.area_codigo).trim() : "";
      const areaEnfase = cargo?.area_enfase ? String(cargo.area_enfase).trim() : "";
      const labelExibicao = cargo?.label_exibicao ? String(cargo.label_exibicao).trim() : "";
      const fallbackName = [
        nomeCargo || cargo?.name || cargo?.rawLabel || "",
        areaCodigo ? `- ${areaCodigo}` : "",
        areaEnfase ? `- ${areaEnfase}` : "",
      ].filter(Boolean).join(" ").trim();

      return {
        id: String(cargo?.id || `cargo-${index + 1}`),
        name: labelExibicao || fallbackName,
        rawLabel: String(cargo?.rawLabel || cargo?.name || labelExibicao || nomeCargo || "").trim(),
        evidence: String(cargo?.evidence || "").trim(),
        nome_cargo: nomeCargo || null,
        area_codigo: areaCodigo || null,
        area_enfase: areaEnfase || null,
        label_exibicao: labelExibicao || fallbackName || null,
      };
    })
    .filter((cargo: any) => cargo.name.length > 0);

  return {
    edital: {
      name: String(edital?.name || concurso || "Edital analisado por IA").trim(),
      organ: edital?.organ ? String(edital.organ).trim() : orgao || null,
      year: edital?.year ? String(edital.year).trim() : ano || null,
      examDate: normalizeDate(edital?.examDate || raw?.data_prova),
      banca: edital?.banca ? String(edital.banca).trim() : banca || null,
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

function getLeadingTopicNumber(value: string): number | null {
  const match = value.trim().match(/^(\d+)(?!\.\d)(?:[.)]|\s)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function mergeNumberedTopicContinuations<T extends { name: string; position: number | null }>(topics: T[]): T[] {
  const merged: T[] = [];

  for (let index = 0; index < topics.length; index++) {
    const current = topics[index];
    const currentNumber = getLeadingTopicNumber(current.name);

    if (currentNumber === null) {
      merged.push(current);
      continue;
    }

    const continuationItems: T[] = [];
    let cursor = index + 1;

    while (cursor < topics.length && getLeadingTopicNumber(topics[cursor].name) === null) {
      continuationItems.push(topics[cursor]);
      cursor++;
    }

    const nextNumber = cursor < topics.length ? getLeadingTopicNumber(topics[cursor].name) : null;
    if (continuationItems.length > 0 && nextNumber === currentNumber + 1) {
      merged.push({
        ...current,
        name: [current.name, ...continuationItems.map((topic) => topic.name)].join(" ").replace(/\s+/g, " ").trim(),
      });
      index = cursor - 1;
    } else {
      merged.push(current);
    }
  }

  return merged.map((topic, index) => ({ ...topic, position: index }));
}

function normalizeExtraction(raw: any, selectedCargo: string) {
  const edital = raw?.edital || {};
  const subjects = Array.isArray(raw?.subjects)
    ? raw.subjects
    : Array.isArray(raw?.conteudo)
      ? raw.conteudo
      : [];

  return {
    edital: {
      name: String(edital?.name || "Edital importado por IA").trim(),
      organ: edital?.organ ? String(edital.organ).trim() : null,
      year: edital?.year ? String(edital.year).trim() : null,
      examDate: normalizeDate(edital?.examDate),
      banca: edital?.banca ? String(edital.banca).trim() : null,
    },
    selectedCargo: String(raw?.selectedCargo || raw?.cargo_alvo || selectedCargo || "").trim(),
    subjects: subjects
      .map((subject: any) => {
        const weight = subject?.weight || {};
        const topics = Array.isArray(subject?.topics)
          ? subject.topics
          : Array.isArray(subject?.topicos)
            ? subject.topicos
            : [];
        return {
          title: String(subject?.title || subject?.name || subject?.disciplina || "").trim(),
          type: subject?.type || subject?.tipo ? String(subject.type || subject.tipo).trim() : null,
          weight: {
            points: normalizeNumber(weight.points),
            questions: normalizeNumber(weight.questions),
            percentage: normalizeNumber(weight.percentage),
            rawText: weight.rawText ? String(weight.rawText).trim() : null,
          },
          topics: mergeNumberedTopicContinuations(
            topics
              .map((topic: any, index: number) => ({
                name: String(typeof topic === "string" ? topic : topic?.name || topic?.n || "").replace(/\s+/g, " ").trim(),
                position: normalizeNumber(topic?.position) ?? index,
              }))
              .filter((topic: any) => topic.name.length >= 2),
          ),
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
    const { inputText, pdfUrl, pdfPath, pdfFileUri, selectedCargo, selectedCargoId, analysis } = reqData;

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
    const selectedCargoParts = getSelectedCargoParts(analysis, selectedCargo || reqData.position || "", selectedCargoId);
    const basePrompt =
      mode === "analyze"
        ? DEFAULT_ANALYSIS_PROMPT
        : `${DEFAULT_EXTRACTION_PROMPT
            .replace(/{{selectedCargo}}/g, selectedCargo || reqData.position || "")
            .replace(/{{selectedCargoName}}/g, selectedCargoParts.name || selectedCargo || reqData.position || "")
            .replace(/{{selectedCargoArea}}/g, selectedCargoParts.area || "null")}

${WEIGHT_EXTRACTION_DISABLED_RULES}`;
    const prompt = withBankProfileInstruction(basePrompt, mode, inputText, analysis);

    const selectedOptionContext = buildSelectedOptionContext(analysis, selectedCargo || reqData.position || "", selectedCargoId);
    const contextInstruction = mode === "extractForCargo" && selectedOptionContext
      ? `${prompt}\n\nDADOS DA OPCAO SELECIONADA:\n${selectedOptionContext}`
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
