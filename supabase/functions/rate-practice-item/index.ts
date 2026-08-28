import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { practiceFeedbackSchema } from "../_shared/practiceContracts.ts";
import {
  shouldQuarantinePrivateItem,
  shouldRestorePrivateItem,
} from "../_shared/practiceQuality.ts";

const allowedOrigins = (Deno.env.get("PRACTICE_ALLOWED_ORIGINS") ??
  "http://localhost:8081,http://127.0.0.1:8081,http://localhost:9999,http://127.0.0.1:9999")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function headers(request: Request): HeadersInit {
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
}

function json(
  request: Request,
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers(request), "Content-Type": "application/json" },
  });
}

serve(async (request) => {
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.includes(origin)) {
    return json(request, { error: "Origem não permitida." }, 403);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: headers(request) });
  }
  if (request.method !== "POST") {
    return json(request, { error: "Método não permitido." }, 405);
  }

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

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser(
      authorization.slice("Bearer ".length),
    );
    if (userError || !userData.user) {
      return json(request, { error: "Sessão inválida." }, 401);
    }

    const parsed = practiceFeedbackSchema.safeParse(await request.json());
    if (!parsed.success) {
      return json(request, {
        error: "Avaliação inválida.",
        details: parsed.error.issues.map((issue) => issue.message),
      }, 400);
    }

    const input = parsed.data;
    const { data: servedItem, error: servedItemError } = await supabase
      .from("practice_session_items")
      .select("item_id")
      .eq("user_id", userData.user.id)
      .eq("session_id", input.sessionId)
      .eq("item_id", input.itemId)
      .maybeSingle();
    if (servedItemError) throw servedItemError;
    if (!servedItem) {
      return json(request, { error: "Item não disponível nesta sessão." }, 404);
    }

    const { data: attempt, error: attemptError } = await supabase
      .from("practice_attempts")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("session_id", input.sessionId)
      .eq("item_id", input.itemId)
      .is("invalidated_at", null)
      .maybeSingle();
    if (attemptError) throw attemptError;
    if (!attempt) {
      return json(
        request,
        { error: "Responda antes de avaliar este item." },
        409,
      );
    }

    const { error: feedbackError } = await supabase
      .from("practice_item_feedback")
      .upsert({
        user_id: userData.user.id,
        session_id: input.sessionId,
        item_id: input.itemId,
        rating: input.rating,
        reason: input.reason ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,item_id" });
    if (feedbackError) throw feedbackError;

    if (input.rating === -1 && input.reason) {
      const { data: existingReport, error: existingReportError } =
        await supabase
          .from("practice_item_reports")
          .select("id")
          .eq("user_id", userData.user.id)
          .eq("item_id", input.itemId)
          .eq("status", "open")
          .maybeSingle();
      if (existingReportError) throw existingReportError;

      if (!existingReport) {
        const { error: reportError } = await supabase
          .from("practice_item_reports")
          .insert({
            user_id: userData.user.id,
            item_id: input.itemId,
            reason: input.reason,
          });
        if (reportError && reportError.code !== "23505") throw reportError;
      }

      if (shouldQuarantinePrivateItem(input.rating, input.reason)) {
        const { error: quarantineError } = await supabase
          .from("practice_items")
          .update({
            status: "quarantined",
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.itemId)
          .eq("status", "private_ready");
        if (quarantineError) throw quarantineError;
      }
    } else {
      const { error: reportDismissError } = await supabase
        .from("practice_item_reports")
        .update({ status: "dismissed", updated_at: new Date().toISOString() })
        .eq("user_id", userData.user.id)
        .eq("item_id", input.itemId)
        .eq("status", "open");
      if (reportDismissError) throw reportDismissError;

      if (shouldRestorePrivateItem(input.rating)) {
        const { error: restoreError } = await supabase
          .from("practice_items")
          .update({
            status: "private_ready",
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.itemId)
          .eq("status", "quarantined");
        if (restoreError) throw restoreError;
      }
    }

    return json(request, {
      rating: input.rating,
      hiddenFromFutureSessions: input.rating === -1,
      quarantined: shouldQuarantinePrivateItem(input.rating, input.reason),
    });
  } catch (error) {
    console.error(
      "rate-practice-item failed",
      error instanceof Error ? error.message : "unknown",
    );
    return json(request, {
      error: "Não foi possível registrar sua avaliação. Tente novamente.",
    }, 500);
  }
});
