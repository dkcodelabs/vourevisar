import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import cebraspeProfile from "../_shared/bank-profiles/cebraspe.json" assert { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ExtractMode = "analyze" | "extractForCargo" | "mapContentStructure" | "extractSubject" | "extractWeights";
type BankProfile = {
  banca: string;
  aliases: string[];
  instrucao_para_ia?: string;
  [key: string]: unknown;
};

const BANK_PROFILES: BankProfile[] = [cebraspeProfile as BankProfile];
const VALID_EXTRACT_MODES = ["analyze", "extractForCargo", "mapContentStructure", "extractSubject", "extractWeights"] as const;

const DEFAULT_ANALYSIS_PROMPT = `Voce e um extrator de dados automatizado especializado em editais de concursos publicos. Sua tarefa e ler o documento fornecido e identificar a banca organizadora e os cargos ofertados.

Regras:
- Seja adaptativo: se o edital oferecer apenas UM cargo, retorne apenas ele. Se oferecer multiplos cargos, areas, enfases ou especialidades, liste cada variacao como um item separado.
- Opcoes reais do aluno sao apenas cargo, area, enfase ou especialidade. Nao trate perfil, bloco, trilha, P1, P2 ou similares como cargo/opcao.
- Ignore nivel de escolaridade, salarios, cronogramas e regras administrativas.
- Identifique a banca organizadora quando ela aparecer explicitamente no documento. Exemplos: Cebraspe, Cespe, FGV, FCC, Vunesp, AOCP.
- Se a banca nao aparecer explicitamente, use null. Nao chute a banca pelo estilo do edital.
- Nao use listas parciais de curso de formacao, capacitacao, treinamento, contratacao ou lotacao como lista final de cargos/opcoes. Essas listas sao administrativas e podem omitir opcoes.
- Para listar cargos/opcoes, procure secoes oficiais como DAS VAGAS, DOS CARGOS, DOS REQUISITOS, ANEXO DAS ENFASES/AREAS/CARGOS ou a secao de CONHECIMENTOS/OBJETOS DE AVALIACAO.
- Identifique o orgao/instituicao, ano do edital/concurso e data da prova quando estiverem explicitamente no documento.
- Para data da prova, retorne null se ela nao estiver no edital. Nao invente data.
- Se um cargo nao tiver area, enfase ou especialidade especifica, deixe area_codigo e area_enfase como null.
- Se o edital tiver apenas uma opcao, retorne o nome real do cargo/opcao conforme aparece no edital. Nunca use "Cargo unico" como nome de cargo.
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
- Nao transcreva trechos longos literalmente do edital. Para cada item numerado, gere um rotulo de estudo curto e fiel, mantendo a numeracao original e os termos essenciais. O objetivo e estruturar para estudo, nao copiar o documento.
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

const MAP_CONTENT_STRUCTURE_PROMPT = `Voce e um mapeador de estruturas textuais especializado em editais de concursos publicos. Sua tarefa e localizar os limites de cada disciplina do conteudo programatico APENAS para o cargo alvo fornecido.

Dados do Cargo Alvo:
- Nome do Cargo: "{{selectedCargoName}}"
- Area/Enfase: "{{selectedCargoArea}}"

Regras de Mapeamento:
- Use o TEXTO DO EDITAL fornecido como fonte principal. As ancoras precisam existir nesse texto, pois um sistema fara o recorte deterministico depois.
- Identifique materias de Conhecimentos Basicos, Conhecimentos Especificos ou Geral que se aplicam ao cargo alvo.
- Se houver modalidades, cargos, areas ou enfases, use apenas divisao explicita no edital. Se o conteudo programatico nao separar por modalidade, mapeie o bloco comum.
- Nao transcreva o conteudo completo da materia. Retorne apenas titulos e ancoras curtas.
- startHeading deve ser o titulo da disciplina como aparece no texto, sem inventar. Exemplo: "DIREITO CONSTITUCIONAL:".
- startAnchor deve conter de 5 a 12 palavras literais do inicio da disciplina, preferencialmente incluindo o titulo e o primeiro item numerado.
- firstTopicAnchor deve ser o primeiro topico numerado literal quando existir.
- endHeading deve ser o titulo da proxima disciplina como aparece no texto. Se for a ultima disciplina do bloco, use null.
- endAnchor deve conter de 5 a 12 palavras literais do inicio da proxima disciplina quando existir. Se for a ultima disciplina do bloco, use null.
- Nao crie materia a partir de agrupadores como CONHECIMENTOS, BLOCO I, BLOCO II, P1 ou P2. Eles sao agrupadores, nao disciplinas.
- Retorne as materias na ordem original.
- Retorne ESTRITAMENTE JSON puro, sem markdown e sem explicacoes.

Formato JSON esperado:
{
  "cargo_alvo": "Nome do Cargo - Area se houver",
  "materias": [
    {
      "chave": "direito_constitucional",
      "titulo": "DIREITO CONSTITUCIONAL",
      "tipo_conhecimento": "Conhecimentos Basicos ou Conhecimentos Especificos ou Geral",
      "ordem": 1,
      "startHeading": "DIREITO CONSTITUCIONAL:",
      "endHeading": "DIREITO ADMINISTRATIVO:",
      "startAnchor": "DIREITO CONSTITUCIONAL: 1 Constitucionalismo",
      "endAnchor": "DIREITO ADMINISTRATIVO: 1 Estado, governo",
      "firstTopicAnchor": "1 Constitucionalismo",
      "lastTopicAnchor": null,
      "confidence": "high",
      "evidencia_localizacao": "Encontrado no bloco de conhecimentos especificos"
    }
  ],
  "avisos": []
}`;

const EXTRACT_SUBJECT_PROMPT = `Voce e um assistente de estruturacao de conteudo programatico. Sua tarefa e extrair fielmente os topicos da disciplina alvo usando APENAS o trecho fornecido.

Disciplina Alvo: "{{subjectTitle}}"
Tipo: "{{knowledgeType}}"

Regras:
- Preserve a numeracao original quando ela existir.
- Preserve o texto integral de cada topico como aparece no trecho, incluindo complementos apos virgula, ponto e virgula, dois-pontos, parenteses e expressoes como "tais como", "incluindo", "especialmente" ou "entre outros".
- Nao resuma nomes de leis, atos, provimentos, resolucoes, sumulas ou listas normativas.
- Nao reduza listas exemplificativas ou listas normativas. Se o topico mencionar varias areas, leis, numeros ou exemplos, mantenha todos no mesmo topico.
- Nao invente titulos e nao use conhecimento externo.
- So quebre em topicos menores quando houver enumeracao interna clara no proprio trecho.
- Ignore o titulo da disciplina se ele aparecer no inicio do trecho; ele nao deve virar topico.
- Retorne ESTRITAMENTE JSON puro, sem markdown e sem explicacoes.

Formato JSON esperado:
{
  "disciplina": "{{subjectTitle}}",
  "tipo": "{{knowledgeType}}",
  "topicos": [
    "1 Topico conforme o trecho",
    "1.1 Subtopico conforme o trecho"
  ],
  "avisos": []
}`;

const WEIGHT_EXTRACTION_DISABLED_RULES = `PESO / IMPORTANCIA:
- Nao calcule peso nesta etapa.
- Nao procure tabela de prova para tentar inferir peso agora.
- Para todas as disciplinas, retorne weight.points, weight.questions, weight.percentage e weight.rawText como null.
- O peso sera tratado em uma etapa propria depois, normalmente a partir de quantidade de questoes ou pontuacao por materia.`;

const EXTRACT_WEIGHTS_PROMPT = `Voce e um extrator conservador de pesos oficiais de disciplinas em editais de concursos publicos.

Sua tarefa e procurar APENAS informacoes explicitas de peso, numero de questoes, valor por questao, pontuacao total ou percentual por disciplina para o cargo alvo.

Dados do Cargo Alvo:
- Nome do Cargo: "{{selectedCargoName}}"
- Area/Enfase: "{{selectedCargoArea}}"

Disciplinas ja extraidas pelo sistema:
{{subjectsJson}}

Regras obrigatorias:
- Responda somente sobre as disciplinas recebidas na lista. Nunca crie disciplina nova.
- Use secoes como "Das Provas", "Prova Objetiva", "Quadro de Provas", "Conteudos e Pontuacao", "Distribuicao das Questoes" ou equivalentes.
- Preencha peso por disciplina apenas quando houver evidencia explicita ligada a essa disciplina.
- Se o edital trouxer apenas peso por bloco/area (ex.: "Conhecimentos Basicos - 40 questoes") sem detalhar por disciplina, retorne status "block_only" e nao distribua esse peso entre disciplinas.
- Se houver apenas pontuacao geral da prova sem quebra por disciplina, retorne status "not_found".
- Nao use quantidade de topicos, criterios de desempate, importancia percebida, ordem de aparicao ou conhecimento comum para inferir peso.
- Nao assuma que questao vale 1 ponto se o edital nao disser isso explicitamente.
- Se houver numero de questoes e valor/peso por questao explicitamente para a disciplina, voce pode calcular points = questions * valor_por_questao.
- rawText deve conter trecho curto do edital que justifica o peso. Se nao houver evidencia, use null.
- Retorne ESTRITAMENTE JSON puro, sem markdown e sem explicacoes.

Formato JSON esperado:
{
  "status": "found | not_found | block_only | ambiguous",
  "subjects": [
    {
      "subjectId": "id exatamente como recebido",
      "subjectName": "nome exatamente como recebido",
      "questions": 10,
      "points": 20,
      "percentage": null,
      "rawText": "Disciplina X: 10 questoes, peso 2"
    }
  ],
  "blockWeights": [
    {
      "blockName": "Conhecimentos Basicos",
      "questions": 40,
      "points": null,
      "percentage": null,
      "rawText": "Conhecimentos Basicos: 40 questoes"
    }
  ],
  "message": "Resumo curto ou null"
}`;

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
  const profilesToShow = matchedProfiles.length > 0
    ? matchedProfiles
    : mode === "analyze"
      ? BANK_PROFILES
      : [];

  if (!profilesToShow.length) return "";

  const instructions = profilesToShow
    .map((profile) => JSON.stringify(profile, null, 2))
    .join("\n\n");

  const profileModeInstruction = matchedProfiles.length > 0
    ? "Use o perfil abaixo como regra de leitura estrutural."
    : "A banca ainda nao foi confirmada antes da leitura. Leia o PDF, identifique a banca explicitamente e use apenas o perfil cuja banca ou alias aparecer no edital. Se nenhum perfil corresponder, use as regras gerais do prompt.";

  return `\n\nPERFIS DE BANCA PARA GUIAR A IA:
${profileModeInstruction} O perfil nao substitui o edital: se nao houver evidencia no edital, nao invente. Quando a extracao der errado, o ajuste deve ser feito neste perfil, nao com regra especifica de edital no codigo.
${instructions}`;
}

function withBankProfileInstruction(basePrompt: string, mode: ExtractMode, inputText?: string, analysis?: any) {
  return `${basePrompt}${buildBankProfileInstruction(mode, inputText, analysis)}`;
}

function buildUserProvidedContext(reqData: any) {
  const lines = [
    reqData?.banca ? `Banca informada pelo aluno: ${reqData.banca}` : "",
    reqData?.origin ? `Orgao/concurso informado pelo aluno: ${reqData.origin}` : "",
    reqData?.targetCargo ? `Cargo/area/enfase alvo informado pelo aluno: ${reqData.targetCargo}` : "",
  ].filter(Boolean);

  if (!lines.length) return "";

  return `DADOS INFORMADOS PELO ALUNO:
${lines.join("\n")}

Use estes dados como pistas de leitura estrutural. Confirme no edital quando houver evidencia. Se o cargo/area/enfase alvo foi informado, procure a opcao equivalente mesmo que a grafia ou ordem esteja diferente. Nao invente conteudo que nao esteja no edital.`;
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

function isLikelyTopicMarker(value: string, markerIndex: number, markerValue: string) {
  const next = value.slice(markerIndex + markerValue.length);
  if (/^[.)]/.test(next)) return true;
  const nextVisibleChar = next.trimStart()[0] || "";
  return /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9]/.test(nextVisibleChar);
}

function hasLeadingTopicMarker(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}(?:\.\d{1,2})*)/);
  return !!match && isLikelyTopicMarker(trimmed, 0, match[1]);
}

type NormalizedTopic = { name: string; position: number | null };

function removeLeadingContentGroup(value: string) {
  return value
    .replace(/^(BLOCO|P)\s*[IVXLCDM\d]+(?:\s*[-–]\s*[^:]+)?\s*:\s*/i, "")
    .trim();
}

function splitInlineNumberedTopics(topic: NormalizedTopic): NormalizedTopic[] {
  const name = removeLeadingContentGroup(topic.name.replace(/\s+/g, " ").trim());
  const firstMarker = name.match(/^(\d{1,2}(?:\.\d{1,2})*)/);
  if (!firstMarker || !isLikelyTopicMarker(name, 0, firstMarker[1])) {
    return [{ ...topic, name }];
  }

  const markerRegex = /(?:^|\s)(\d{1,2}(?:\.\d{1,2})*)(?=(?:\s+|[A-ZÁÉÍÓÚÂÊÔÃÕÇ])\S)/g;
  const markers: Array<{ index: number; value: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = markerRegex.exec(name)) !== null) {
    const index = match.index + (match[0].startsWith(" ") ? 1 : 0);
    if (isLikelyTopicMarker(name, index, match[1])) {
      markers.push({
        index,
        value: match[1],
      });
    }
  }

  if (markers.length <= 1) {
    return [{ ...topic, name }];
  }

  return markers
    .map((marker, index) => {
      const next = markers[index + 1];
      return {
        ...topic,
        name: name.slice(marker.index, next?.index ?? name.length).trim(),
        position: null,
      };
    })
    .filter((item) => item.name.length >= 2);
}

function expandInlineNumberedTopics(topics: NormalizedTopic[]) {
  return topics.flatMap(splitInlineNumberedTopics);
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

    while (cursor < topics.length && !hasLeadingTopicMarker(topics[cursor].name)) {
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
            expandInlineNumberedTopics(
              topics
                .map((topic: any, index: number) => ({
                  name: String(typeof topic === "string" ? topic : topic?.name || topic?.n || "").replace(/\s+/g, " ").trim(),
                  position: normalizeNumber(topic?.position) ?? index,
                }))
                .filter((topic: any) => topic.name.length >= 2),
            ),
          ),
        };
      })
      .filter((subject: any) => subject.title.length > 0 && subject.topics.length > 0),
    warnings: Array.isArray(raw?.warnings) ? raw.warnings.map((w: any) => String(w)) : [],
  };
}

function normalizeWeightStatus(value: unknown) {
  const normalized = String(value || "").trim();
  if (["found", "not_found", "block_only", "ambiguous", "failed"].includes(normalized)) {
    return normalized;
  }
  return "not_found";
}

function normalizeWeightExtraction(raw: any, allowedSubjects: any[]) {
  const allowedById = new Map(
    allowedSubjects
      .map((subject: any) => ({
        id: String(subject?.id || "").trim(),
        title: String(subject?.title || subject?.name || subject?.subjectName || "").trim(),
      }))
      .filter((subject) => subject.id && subject.title)
      .map((subject) => [subject.id, subject]),
  );

  const rawSubjects = Array.isArray(raw?.subjects) ? raw.subjects : [];
  const subjects = rawSubjects
    .map((subject: any) => {
      const subjectId = String(subject?.subjectId || subject?.id || "").trim();
      const allowed = allowedById.get(subjectId);
      if (!allowed) return null;

      const rawText = subject?.rawText ? String(subject.rawText).replace(/\s+/g, " ").trim() : null;
      return {
        subjectId: allowed.id,
        subjectName: allowed.title,
        questions: normalizeNumber(subject?.questions),
        points: normalizeNumber(subject?.points),
        percentage: normalizeNumber(subject?.percentage),
        rawText: rawText && rawText.length <= 500 ? rawText : rawText ? rawText.slice(0, 497) + "..." : null,
      };
    })
    .filter((subject: any) =>
      subject &&
      subject.rawText &&
      (subject.questions !== null || subject.points !== null || subject.percentage !== null),
    );

  const blockWeights = Array.isArray(raw?.blockWeights)
    ? raw.blockWeights.map((block: any) => ({
        blockName: block?.blockName ? String(block.blockName).trim() : null,
        questions: normalizeNumber(block?.questions),
        points: normalizeNumber(block?.points),
        percentage: normalizeNumber(block?.percentage),
        rawText: block?.rawText ? String(block.rawText).replace(/\s+/g, " ").trim() : null,
      })).filter((block: any) => block.blockName && block.rawText)
    : [];

  const requestedStatus = normalizeWeightStatus(raw?.status);
  const status = subjects.length > 0
    ? "found"
    : blockWeights.length > 0 || requestedStatus === "block_only"
      ? "block_only"
      : requestedStatus === "ambiguous"
        ? "ambiguous"
        : "not_found";

  return {
    status,
    subjects,
    blockWeights,
    message: raw?.message ? String(raw.message).trim() : null,
  };
}

function normalizeSubjectKey(value: unknown, fallback: string) {
  const normalized = String(value || fallback || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "materia";
}

function normalizeKnowledgeType(value: unknown) {
  const raw = String(value || "").trim();
  const normalized = normalizeSearchText(raw);
  if (normalized.includes("basico")) return "Conhecimentos Básicos";
  if (normalized.includes("especifico")) return "Conhecimentos Específicos";
  if (normalized.includes("geral")) return "Geral";
  return raw || "Geral";
}

function normalizeConfidence(value: unknown) {
  const normalized = normalizeSearchText(value);
  if (normalized === "high" || normalized === "medium" || normalized === "low") return normalized;
  return "medium";
}

function normalizeContentStructure(raw: any, selectedCargo: string) {
  const materias = Array.isArray(raw?.materias)
    ? raw.materias
    : Array.isArray(raw?.subjects)
      ? raw.subjects
      : [];

  return {
    cargo_alvo: String(raw?.cargo_alvo || raw?.selectedCargo || selectedCargo || "").trim(),
    materias: materias
      .map((subject: any, index: number) => {
        const title = String(subject?.titulo || subject?.title || subject?.disciplina || subject?.name || "").trim();
        return {
          chave: normalizeSubjectKey(subject?.chave || subject?.key, title || `materia_${index + 1}`),
          titulo: title,
          tipo_conhecimento: normalizeKnowledgeType(subject?.tipo_conhecimento || subject?.tipo || subject?.type),
          ordem: normalizeNumber(subject?.ordem ?? subject?.order) ?? index + 1,
          startHeading: subject?.startHeading ? String(subject.startHeading).trim() : title,
          endHeading: subject?.endHeading ? String(subject.endHeading).trim() : null,
          startAnchor: subject?.startAnchor ? String(subject.startAnchor).trim() : null,
          endAnchor: subject?.endAnchor ? String(subject.endAnchor).trim() : null,
          firstTopicAnchor: subject?.firstTopicAnchor ? String(subject.firstTopicAnchor).trim() : null,
          lastTopicAnchor: subject?.lastTopicAnchor ? String(subject.lastTopicAnchor).trim() : null,
          confidence: normalizeConfidence(subject?.confidence),
          evidencia_localizacao: subject?.evidencia_localizacao || subject?.evidence
            ? String(subject.evidencia_localizacao || subject.evidence).trim()
            : null,
        };
      })
      .filter((subject: any) => subject.titulo.length > 0 && subject.startHeading.length > 0),
    avisos: Array.isArray(raw?.avisos)
      ? raw.avisos.map((w: any) => String(w))
      : Array.isArray(raw?.warnings)
        ? raw.warnings.map((w: any) => String(w))
        : [],
  };
}

function normalizeSubjectTopicExtraction(raw: any, subjectTitle: string, knowledgeType: string) {
  const topics = Array.isArray(raw?.topicos)
    ? raw.topicos
    : Array.isArray(raw?.topics)
      ? raw.topics
      : [];

  const normalizedTopics = mergeNumberedTopicContinuations(
    expandInlineNumberedTopics(
      topics
        .map((topic: any, index: number) => ({
          name: String(typeof topic === "string" ? topic : topic?.name || topic?.n || "").replace(/\s+/g, " ").trim(),
          position: normalizeNumber(topic?.position) ?? index,
        }))
        .filter((topic: any) => topic.name.length >= 2),
    ),
  );

  return {
    disciplina: String(raw?.disciplina || raw?.title || subjectTitle || "").trim(),
    tipo: normalizeKnowledgeType(raw?.tipo || raw?.type || knowledgeType),
    topicos: normalizedTopics,
    avisos: Array.isArray(raw?.avisos)
      ? raw.avisos.map((w: any) => String(w))
      : Array.isArray(raw?.warnings)
        ? raw.warnings.map((w: any) => String(w))
        : [],
  };
}

function buildSourceInstruction(inputText?: string, fileUri?: string | null) {
  const text = inputText?.trim();

  if (fileUri) {
    return "Leia o PDF anexado integralmente.";
  }

  if (text) {
    return `TEXTO DO EDITAL:\n${text}`;
  }

  return "Leia o PDF anexado integralmente.";
}

function buildContents(instruction: string, inputText?: string, fileUri?: string | null) {
  const parts: any[] = [{ text: `${instruction}\n\n${buildSourceInstruction(inputText, fileUri)}` }];
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
    const { inputText, pdfUrl, pdfPath, pdfFileUri, selectedCargo, selectedCargoId, analysis, sourceExcerpt } = reqData;

    if (!VALID_EXTRACT_MODES.includes(mode)) {
      throw new Error(`Modo de extracao invalido: ${mode}`);
    }

    if (mode === "mapContentStructure" && !String(inputText || "").trim()) {
      throw new Error("mapContentStructure exige inputText extraido do PDF para que as ancoras batam com o fatiamento local.");
    }

    if (mode === "extractSubject" && !String(sourceExcerpt || "").trim()) {
      throw new Error("extractSubject exige sourceExcerpt fatiado da disciplina.");
    }

    const weightSubjects = Array.isArray(reqData.subjects) ? reqData.subjects : [];
    if (mode === "extractWeights" && weightSubjects.length === 0) {
      throw new Error("extractWeights exige a lista de disciplinas ja extraidas.");
    }

    if (mode !== "extractSubject" && !inputText && !pdfUrl && !pdfPath && !pdfFileUri) {
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
    const shouldUsePdfFile = mode !== "mapContentStructure" && mode !== "extractSubject";
    if (shouldUsePdfFile && pdfFileUri) {
      fileUri = String(pdfFileUri);
    } else if (shouldUsePdfFile && pdfPath) {
      fileUri = await uploadStoragePdfToGemini(supabaseClient, apiKey, pdfPath, user.id);
    } else if (shouldUsePdfFile && pdfUrl) {
      fileUri = await uploadPdfUrlToGemini(apiKey, pdfUrl);
    }

    const primaryModelName = config.model || "gemini-2.5-flash";
    const modelCandidates = getModelCandidates(config, primaryModelName);
    const maxTokens = mode === "mapContentStructure"
      ? Math.min(config.max_tokens || 8192, 12000)
      : mode === "extractSubject"
        ? Math.min(config.max_tokens || 8192, 12000)
        : mode === "extractWeights"
          ? Math.min(config.max_tokens || 8192, 12000)
          : config.max_tokens || (mode === "analyze" ? 8192 : 32768);
    const profileAnalysisContext = analysis || {
      edital: {
        banca: reqData.banca || null,
        organ: reqData.origin || null,
        name: reqData.origin || null,
      },
    };
    const selectedCargoParts = getSelectedCargoParts(analysis, selectedCargo || reqData.position || reqData.targetCargo || "", selectedCargoId);
    let basePrompt: string;
    if (mode === "analyze") {
      basePrompt = DEFAULT_ANALYSIS_PROMPT;
    } else if (mode === "mapContentStructure") {
      basePrompt = MAP_CONTENT_STRUCTURE_PROMPT
        .replace(/{{selectedCargoName}}/g, selectedCargoParts.name || selectedCargo || reqData.position || "")
        .replace(/{{selectedCargoArea}}/g, selectedCargoParts.area || "null");
    } else if (mode === "extractSubject") {
      basePrompt = EXTRACT_SUBJECT_PROMPT
        .replace(/{{subjectTitle}}/g, String(reqData.subjectTitle || reqData.disciplina || ""))
        .replace(/{{knowledgeType}}/g, String(reqData.knowledgeType || reqData.tipo || "Geral"));
    } else if (mode === "extractWeights") {
      const subjectsJson = JSON.stringify(
        weightSubjects
          .map((subject: any) => ({
            id: String(subject?.id || "").trim(),
            name: String(subject?.title || subject?.name || subject?.subjectName || "").trim(),
            knowledgeType: subject?.knowledgeType || subject?.type || null,
          }))
          .filter((subject: any) => subject.id && subject.name),
        null,
        2,
      );
      basePrompt = EXTRACT_WEIGHTS_PROMPT
        .replace(/{{selectedCargoName}}/g, selectedCargoParts.name || selectedCargo || reqData.position || "")
        .replace(/{{selectedCargoArea}}/g, selectedCargoParts.area || "null")
        .replace(/{{subjectsJson}}/g, subjectsJson);
    } else {
      basePrompt = `${DEFAULT_EXTRACTION_PROMPT
        .replace(/{{selectedCargo}}/g, selectedCargo || reqData.position || "")
        .replace(/{{selectedCargoName}}/g, selectedCargoParts.name || selectedCargo || reqData.position || "")
        .replace(/{{selectedCargoArea}}/g, selectedCargoParts.area || "null")}

${WEIGHT_EXTRACTION_DISABLED_RULES}`;
    }
    const prompt = withBankProfileInstruction(basePrompt, mode, inputText, profileAnalysisContext);
    const userProvidedContext = buildUserProvidedContext(reqData);

    const selectedOptionContext = buildSelectedOptionContext(analysis, selectedCargo || reqData.position || "", selectedCargoId);
    const contextInstruction = (mode === "extractForCargo" || mode === "mapContentStructure" || mode === "extractWeights") && selectedOptionContext
      ? `${prompt}\n\n${userProvidedContext}\n\nDADOS DA OPCAO SELECIONADA:\n${selectedOptionContext}`.trim()
      : `${prompt}\n\n${userProvidedContext}`.trim();

    const payloadInputText = mode === "extractSubject" ? String(sourceExcerpt || "") : inputText;
    const payloadFileUri = mode === "mapContentStructure" || mode === "extractSubject" ? null : fileUri;

    const buildPayload = (modelName: string) => ({
      contents: buildContents(contextInstruction, payloadInputText, payloadFileUri),
      generationConfig: {
        temperature: mode === "extractSubject" || mode === "extractWeights" ? 0 : config.temperature !== undefined ? config.temperature : 0.1,
        topK: config.top_k,
        topP: config.top_p,
        presencePenalty: config.presence_penalty,
        maxOutputTokens: getMaxOutputTokensForModel(modelName, maxTokens),
        responseMimeType: "application/json",
      },
    });

    console.log("[extract-edital] Calling Gemini", { mode, modelCandidates, hasPdf: !!payloadFileUri, hasText: !!payloadInputText });
    const timeoutMs = mode === "extractForCargo" ? 85000 : mode === "extractSubject" ? 45000 : mode === "extractWeights" ? 25000 : 70000;
    const { text, finishReason, usage, modelName } = await callGeminiWithFallbacks(apiKey, modelCandidates, buildPayload, timeoutMs, 1);

    if (finishReason === "MAX_TOKENS") {
      throw new Error("A resposta da IA foi cortada por limite de tokens. Tente enviar apenas a parte do conteudo programatico ou reduzir o edital.");
    }

    if (finishReason === "RECITATION") {
      throw new Error(
        `A IA bloqueou a resposta por recitacao literal do documento. Diagnostico: model=${modelName}; finishReason=${finishReason}; responseLength=${text.length}; promptTokens=${usage?.promptTokenCount ?? "n/a"}; candidatesTokens=${usage?.candidatesTokenCount ?? "n/a"}.`,
      );
    }

    if (!text.trim()) {
      throw new Error(
        `A IA retornou resposta vazia. Diagnostico: model=${modelName}; finishReason=${finishReason}; responseLength=0; promptTokens=${usage?.promptTokenCount ?? "n/a"}; candidatesTokens=${usage?.candidatesTokenCount ?? "n/a"}.`,
      );
    }

    let parsed: any;
    try {
      parsed = parseJsonObject(text);
    } catch (parseError: any) {
      console.error("[extract-edital] invalid JSON response:", {
        mode,
        modelName,
        finishReason,
        responseLength: text.length,
        promptTokens: usage?.promptTokenCount,
        candidatesTokens: usage?.candidatesTokenCount,
        parseError: parseError?.message,
      });
      throw new Error(
        `A IA retornou uma resposta sem JSON valido. Diagnostico: model=${modelName}; finishReason=${finishReason}; responseLength=${text.length}; promptTokens=${usage?.promptTokenCount ?? "n/a"}; candidatesTokens=${usage?.candidatesTokenCount ?? "n/a"}.`,
      );
    }

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

    if (mode === "mapContentStructure") {
      return new Response(JSON.stringify({
        success: true,
        mode,
        structure: normalizeContentStructure(parsed, selectedCargo || reqData.position || ""),
        usage,
        modelName,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode === "extractSubject") {
      return new Response(JSON.stringify({
        success: true,
        mode,
        subject: normalizeSubjectTopicExtraction(
          parsed,
          String(reqData.subjectTitle || reqData.disciplina || ""),
          String(reqData.knowledgeType || reqData.tipo || "Geral"),
        ),
        usage,
        modelName,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode === "extractWeights") {
      return new Response(JSON.stringify({
        success: true,
        mode,
        weights: normalizeWeightExtraction(parsed, weightSubjects),
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
