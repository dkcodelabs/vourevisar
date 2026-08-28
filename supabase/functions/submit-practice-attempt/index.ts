import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { submitPracticeAttemptSchema } from "../_shared/practiceContracts.ts";

const allowedOrigins = (Deno.env.get("PRACTICE_ALLOWED_ORIGINS")
  ?? "http://localhost:8081,http://127.0.0.1:8081,http://localhost:9999,http://127.0.0.1:9999")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function headers(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(request: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers(request), "Content-Type": "application/json" },
  });
}

serve(async (request) => {
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.includes(origin)) return json(request, { error: "Origem não permitida." }, 403);
  if (request.method === "OPTIONS") return new Response(null, { headers: headers(request) });
  if (request.method !== "POST") return json(request, { error: "Método não permitido." }, 405);

  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return json(request, { error: "Sessão obrigatória." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Configuração Supabase ausente.");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser(authorization.slice(7));
    if (userError || !userData.user) return json(request, { error: "Sessão inválida." }, 401);

    const parsed = submitPracticeAttemptSchema.safeParse(await request.json());
    if (!parsed.success) {
      return json(request, {
        error: "Resposta inválida.",
        details: parsed.error.issues.map((issue) => issue.message),
      }, 400);
    }

    const input = parsed.data;
    const { data: attempt, error: attemptError } = await supabase.rpc(
      "submit_practice_attempt_internal",
      {
        p_user_id: userData.user.id,
        p_session_id: input.sessionId,
        p_item_id: input.itemId,
        p_client_attempt_id: input.clientAttemptId,
        p_answer_payload: input.answer,
        p_response_time_ms: input.responseTimeMs ?? null,
        p_algorithm_version: "v1",
      },
    );
    if (attemptError || !attempt) return json(request, { error: "Item não disponível nesta sessão." }, 409);

    const { data: answer, error: answerError } = await supabase.rpc(
      "get_practice_item_answer_internal",
      {
        p_user_id: userData.user.id,
        p_session_id: input.sessionId,
        p_item_id: input.itemId,
        p_flashcard_only: false,
      },
    );
    if (answerError || !answer) throw answerError ?? new Error("Correção indisponível.");

    return json(request, { attempt, answer });
  } catch (error) {
    console.error("submit-practice-attempt failed", error instanceof Error ? error.message : "unknown");
    return json(request, { error: "Não foi possível registrar a resposta. Tente novamente." }, 500);
  }
});

