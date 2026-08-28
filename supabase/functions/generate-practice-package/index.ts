import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.3";

import {
  generatePracticePackageSchema,
} from "../_shared/practiceGenerationContracts.ts";
import {
  buildPracticeCorrectionPrompt,
  buildPracticeGenerationPrompt,
  getPracticeQuestionFormat,
  practicePackageJsonSchema,
  validatePracticePackage,
} from "../_shared/practiceGenerationPrompt.ts";
import {
  getActivePracticeScope,
  noActivePracticeScopeMessage,
  outsidePracticeScopeMessage,
} from "../_shared/practiceScope.ts";

type GenerationReservation = {
  generation_id: string;
  status: "generating" | "succeeded" | "failed" | "rejected";
  package_id: string | null;
  should_generate: boolean;
};

type TopicContext = {
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  editalName: string | null;
  examBoard: string | null;
  topicNotes: string | null;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: { message?: string };
};

class GeminiProviderError extends Error {
  constructor(
    readonly status: number,
    readonly providerCode?: string,
  ) {
    super(`Gemini API HTTP ${status}${providerCode ? ` (${providerCode})` : ""}`);
    this.name = "GeminiProviderError";
  }
}

type GenerationFailure = {
  code: string;
  message: string;
  httpStatus: number;
  providerStatus: number | null;
  providerDetail: string | null;
};

type GenerationStage =
  | "authentication"
  | "context"
  | "reservation"
  | "provider"
  | "validation"
  | "persistence";

const allowedOrigins = (Deno.env.get("PRACTICE_ALLOWED_ORIGINS") ??
  "http://localhost:8081,http://127.0.0.1:8081,http://localhost:9999,http://127.0.0.1:9999")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsHeaders = (request: Request): HeadersInit => {
  const origin = request.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};

const json = (request: Request, body: Record<string, unknown>, status = 200) =>
  new Response(
    JSON.stringify(body),
    {
      status,
      headers: { ...corsHeaders(request), "Content-Type": "application/json" },
    },
  );

const isAllowedOrigin = (request: Request) => {
  const origin = request.headers.get("origin");
  return !origin || allowedOrigins.includes(origin);
};

const textEncoder = new TextEncoder();

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(value),
  );
  return Array.from(new Uint8Array(digest)).map((item) =>
    item.toString(16).padStart(2, "0")
  ).join("");
};

const readTopicNotes = (notes: unknown): string | null => {
  const content = typeof notes === "string"
    ? notes
    : typeof notes === "object" && notes !== null && "content" in notes &&
        typeof notes.content === "string"
    ? notes.content
    : null;

  const normalized = content?.trim().slice(0, 6_000) ?? "";
  return normalized || null;
};

const getTopicContext = async (
  supabase: SupabaseClient,
  userId: string,
  topicId: string,
): Promise<TopicContext | null> => {
  const { data: topic, error: topicError } = await supabase
    .from("topics")
    .select("id, name, subject_id, notes, edital_id")
    .eq("id", topicId)
    .maybeSingle();
  if (topicError) throw topicError;
  if (!topic) return null;

  const { data: subject, error: subjectError } = await supabase
    .from("subjects")
    .select("id, name, user_id, edital_id")
    .eq("id", topic.subject_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (subjectError) throw subjectError;
  if (!subject) return null;

  const editalId = topic.edital_id ?? subject.edital_id;
  if (!editalId) {
    return {
      topicId: topic.id,
      topicName: topic.name,
      subjectId: subject.id,
      subjectName: subject.name,
      editalName: null,
      examBoard: null,
      topicNotes: readTopicNotes(topic.notes),
    };
  }

  const { data: edital, error: editalError } = await supabase
    .from("user_editais")
    .select("name, exam_board")
    .eq("id", editalId)
    .eq("user_id", userId)
    .maybeSingle();
  if (editalError) throw editalError;

  return {
    topicId: topic.id,
    topicName: topic.name,
    subjectId: subject.id,
    subjectName: subject.name,
    editalName: edital?.name ?? null,
    examBoard: edital?.exam_board ?? null,
    topicNotes: readTopicNotes(topic.notes),
  };
};

const callGemini = async (
  apiKey: string,
  model: string,
  prompt: string,
): Promise<GeminiResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55_000);
  const normalizedModel = model.replace(/^models\//, "");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${
        encodeURIComponent(normalizedModel)
      }:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: Number(
              Deno.env.get("PRACTICE_GENERATION_MAX_OUTPUT_TOKENS") ?? "8000",
            ),
            responseMimeType: "application/json",
            responseJsonSchema: practicePackageJsonSchema,
          },
        }),
        signal: controller.signal,
      },
    );

    const rawPayload = await response.text();
    let payload: GeminiResponse;
    try {
      payload = JSON.parse(rawPayload) as GeminiResponse;
    } catch {
      throw new GeminiProviderError(response.status);
    }

    if (!response.ok || payload.error) {
      throw new GeminiProviderError(
        response.status,
        typeof payload.error?.message === "string"
          ? payload.error.message.slice(0, 120)
          : undefined,
      );
    }

    return payload;
  } finally {
    clearTimeout(timeoutId);
  }
};

const sanitizeFailureDetail = (value: string) =>
  value
    .replace(/AIza[\w-]{20,}/g, "[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);

const getFailureDetail = (error: unknown) => {
  if (error instanceof Error) {
    return sanitizeFailureDetail(`${error.name}: ${error.message}`);
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    return sanitizeFailureDetail(String(error.message));
  }
  return null;
};

const classifyGenerationFailure = (
  error: unknown,
  stage: GenerationStage,
): GenerationFailure => {
  if (error instanceof GeminiProviderError) {
    const providerDetail = error.providerCode
      ? sanitizeFailureDetail(error.providerCode)
      : null;

    if (error.status === 401 || error.status === 403) {
      return {
        code: "provider_authentication_failed",
        message: "A geração está temporariamente indisponível.",
        httpStatus: 503,
        providerStatus: error.status,
        providerDetail,
      };
    }

    if (error.status === 429) {
      return {
        code: "provider_rate_limited",
        message: "A IA atingiu o limite temporário. Tente novamente em alguns minutos.",
        httpStatus: 429,
        providerStatus: error.status,
        providerDetail,
      };
    }

    if (error.status >= 500) {
      return {
        code: "provider_unavailable",
        message: "A IA está temporariamente indisponível. Tente novamente em alguns minutos.",
        httpStatus: 503,
        providerStatus: error.status,
        providerDetail,
      };
    }

    return {
      code: "provider_request_rejected",
      message: "A geração está temporariamente indisponível.",
      httpStatus: 503,
      providerStatus: error.status,
      providerDetail,
    };
  }

  if (error instanceof Error && error.name === "AbortError") {
    return {
      code: "provider_timeout",
      message: "A IA demorou mais do que o esperado. Tente novamente em alguns minutos.",
      httpStatus: 504,
      providerStatus: null,
      providerDetail: null,
    };
  }

  if (stage === "provider") {
    return {
      code: "provider_transport_failed",
      message: "A IA está temporariamente indisponível. Tente novamente em alguns minutos.",
      httpStatus: 503,
      providerStatus: null,
      providerDetail: getFailureDetail(error),
    };
  }

  return {
    code: `generation_${stage}_failed`,
    message: "Não foi possível gerar o material agora. Tente novamente.",
    httpStatus: 500,
    providerStatus: null,
    providerDetail: getFailureDetail(error),
  };
};

const getGeminiText = (response: GeminiResponse) =>
  response.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim() ?? "";

const reportFailure = async (
  supabase: SupabaseClient,
  generationId: string,
  userId: string,
  status: "failed" | "rejected",
  code: string,
  message: string,
  rejectionSummary: string[] = [],
  providerAttemptCount = 1,
) => {
  await supabase.rpc("fail_practice_generation_internal", {
    p_generation_id: generationId,
    p_user_id: userId,
    p_status: status,
    p_failure_code: code,
    p_failure_message: message,
    p_provider_attempt_count: providerAttemptCount,
    p_rejection_summary: rejectionSummary,
  });
};

serve(async (request) => {
  if (!isAllowedOrigin(request)) {
    return json(request, { error: "Origem não permitida." }, 403);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return json(request, { error: "Método não permitido." }, 405);
  }

  let generationId: string | null = null;
  let userId: string | null = null;
  let supabase: SupabaseClient | null = null;
  let providerAttemptCount = 0;
  let generationStage: GenerationStage = "authentication";

  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return json(request, { error: "Sessão obrigatória." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Configuração Supabase ausente.");
    }

    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser(
      authorization.slice("Bearer ".length),
    );
    if (userError || !userData.user) {
      return json(request, { error: "Sessão inválida." }, 401);
    }
    userId = userData.user.id;

    const parsed = generatePracticePackageSchema.safeParse(
      await request.json(),
    );
    if (!parsed.success) {
      return json(request, {
        error: "Dados de geração inválidos.",
        details: parsed.error.issues.map((issue) => issue.message),
      }, 400);
    }

    generationStage = "context";
    const scope = await getActivePracticeScope(supabase, userId);
    if (scope.status !== "active") {
      return json(request, { error: noActivePracticeScopeMessage }, 409);
    }

    const context = await getTopicContext(
      supabase,
      userId,
      parsed.data.topicId,
    );
    if (!context) {
      return json(request, { error: "Tópico não encontrado." }, 404);
    }
    if (!scope.subjectIds.includes(context.subjectId)) {
      return json(request, { error: outsidePracticeScopeMessage }, 409);
    }

    const modelId = Deno.env.get("PRACTICE_GENERATION_MODEL") ??
      "gemini-2.5-flash";
    const promptVersion = "practice-package-v1";
    const schemaVersion = "practice-package-schema-v1";
    const contextFingerprint = await sha256(JSON.stringify({
      subjectName: context.subjectName,
      topicName: context.topicName,
      editalName: context.editalName,
      examBoard: context.examBoard,
      topicNotes: context.topicNotes,
      promptVersion,
      schemaVersion,
    }));

    const requestContext = {
      subjectName: context.subjectName,
      topicName: context.topicName,
      editalName: context.editalName,
      examBoard: context.examBoard,
      hasTopicNotes: Boolean(context.topicNotes),
      topicNotesLength: context.topicNotes?.length ?? 0,
    };

    generationStage = "reservation";
    const { data: reservations, error: reserveError } = await supabase
      .rpc("reserve_practice_generation_internal", {
        p_user_id: userId,
        p_topic_id: context.topicId,
        p_idempotency_key: parsed.data.idempotencyKey,
        p_trigger: parsed.data.trigger,
        p_context_fingerprint: contextFingerprint,
        p_request_context: requestContext,
        p_model_id: modelId,
        p_prompt_version: promptVersion,
        p_schema_version: schemaVersion,
      });
    if (reserveError) throw reserveError;

    const reservation = (reservations as GenerationReservation[] | null)?.[0];
    if (!reservation) throw new Error("Reserva de geração indisponível.");
    generationId = reservation.generation_id;

    if (!reservation.should_generate) {
      return json(request, {
        status: reservation.status === "succeeded" ? "ready" : "preparing",
        generationId: reservation.generation_id,
        packageId: reservation.package_id,
        reused: true,
      });
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      await reportFailure(
        supabase,
        generationId,
        userId,
        "failed",
        "configuration_missing",
        "Geração indisponível no momento.",
        [],
        providerAttemptCount,
      );
      return json(request, { error: "Geração indisponível no momento." }, 503);
    }

    generationStage = "provider";
    const prompt = buildPracticeGenerationPrompt(context);
    providerAttemptCount += 1;
    const providerResponse = await callGemini(geminiApiKey, modelId, prompt);
    const providerResponses = [providerResponse];
    generationStage = "validation";
    const questionFormat = getPracticeQuestionFormat(context.examBoard);
    const validateProviderResponse = (response: GeminiResponse) => {
      const rawText = getGeminiText(response);
      if (!rawText) {
        return {
          ok: false as const,
          reasons: ["O modelo não retornou material utilizável."],
        };
      }

      try {
        return validatePracticePackage(JSON.parse(rawText), questionFormat);
      } catch {
        return {
          ok: false as const,
          reasons: ["O modelo não retornou JSON estruturado."],
        };
      }
    };

    let validation = validateProviderResponse(providerResponse);
    if (!validation.ok) {
      providerAttemptCount += 1;
      const correctedResponse = await callGemini(
        geminiApiKey,
        modelId,
        buildPracticeCorrectionPrompt(context, validation.reasons),
      );
      providerResponses.push(correctedResponse);
      validation = validateProviderResponse(correctedResponse);
    }

    if (!validation.ok) {
      await reportFailure(
        supabase,
        generationId,
        userId,
        "rejected",
        "editorial_validation_failed",
        "O lote não passou na validação editorial.",
        validation.reasons,
        providerAttemptCount,
      );
      return json(request, {
        error: "Não foi possível gerar um lote confiável. Tente novamente.",
      }, 422);
    }

    const usage = providerResponses.reduce((total, response) => ({
      inputTokens: total.inputTokens +
        (response.usageMetadata?.promptTokenCount ?? 0),
      outputTokens: total.outputTokens +
        (response.usageMetadata?.candidatesTokenCount ?? 0),
      totalTokens: total.totalTokens +
        (response.usageMetadata?.totalTokenCount ?? 0),
    }), { inputTokens: 0, outputTokens: 0, totalTokens: 0 });
    generationStage = "persistence";
    const { data: packageId, error: completeError } = await supabase
      .rpc("complete_practice_generation_internal", {
        p_generation_id: generationId,
        p_user_id: userId,
        p_quick_recap: validation.value.quickRecap,
        p_items: validation.value.items,
        p_input_tokens: usage.inputTokens || null,
        p_output_tokens: usage.outputTokens || null,
        p_total_tokens: usage.totalTokens || null,
        p_estimated_cost: null,
        p_provider_attempt_count: providerAttemptCount,
        p_rejection_summary: [],
      });
    if (completeError || !packageId) {
      throw completeError ?? new Error("Pacote não persistido.");
    }

    return json(request, {
      status: "ready",
      generationId,
      packageId,
      reused: false,
    });
  } catch (error) {
    const failure = classifyGenerationFailure(error, generationStage);
    console.error(
      "generate-practice-package failed",
      {
        code: failure.code,
        providerStatus: failure.providerStatus,
      },
    );
    if (supabase && generationId && userId) {
      await reportFailure(
        supabase,
        generationId,
        userId,
        "failed",
        failure.code,
        failure.message,
        [
          `stage:${generationStage}`,
          `provider_status:${failure.providerStatus ?? "unknown"}`,
          ...(failure.providerDetail ? [failure.providerDetail] : []),
        ],
        providerAttemptCount,
      );
    }
    return json(request, {
      error: failure.message,
    }, failure.httpStatus);
  }
});
