import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { revealPracticeItemSchema } from "../_shared/practiceContracts.ts";

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

    const parsed = revealPracticeItemSchema.safeParse(await request.json());
    if (!parsed.success) return json(request, { error: "Dados de cartão inválidos." }, 400);

    const { data, error } = await supabase.rpc("get_practice_item_answer_internal", {
      p_user_id: userData.user.id,
      p_session_id: parsed.data.sessionId,
      p_item_id: parsed.data.itemId,
      p_flashcard_only: true,
    });
    if (error || !data) return json(request, { error: "Cartão não encontrado." }, 404);

    return json(request, { answer: data });
  } catch (error) {
    console.error("reveal-practice-item failed", error instanceof Error ? error.message : "unknown");
    return json(request, { error: "Não foi possível revelar a resposta." }, 500);
  }
});

