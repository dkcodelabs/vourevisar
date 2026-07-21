import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const attemptIdPattern = /^[0-9a-f-]{36}$/i;
const actions = new Set(["create", "status", "confirm"]);

type RequestBody = {
  action?: "create" | "status" | "confirm";
  attempt_id?: string;
};

const json = (body: Record<string, unknown>, status = 200) => new Response(
  JSON.stringify(body),
  { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
);

const getAdminClient = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) throw new Error("Configuracao Supabase ausente");

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo nao permitido" }, 405);

  try {
    const body = await req.json() as RequestBody;
    const action = body.action;
    const attemptId = body.attempt_id;

    if (!action || !actions.has(action) || !attemptId || !attemptIdPattern.test(attemptId)) {
      return json({ error: "Tentativa de confirmacao invalida" }, 400);
    }

    const admin = getAdminClient();

    if (action === "create") {
      const { error } = await admin.from("email_confirmation_attempts").insert({ attempt_id: attemptId });
      if (error && error.code !== "23505") throw error;
      return json({ status: "pending" });
    }

    if (action === "confirm") {
      const authorization = req.headers.get("Authorization");
      if (!authorization) return json({ error: "Sessao de confirmacao ausente" }, 401);

      const token = authorization.replace(/^Bearer\s+/i, "");
      const { data: userData, error: userError } = await admin.auth.getUser(token);
      if (userError || !userData.user) return json({ error: "Sessao de confirmacao invalida" }, 401);

      const { error } = await admin
        .from("email_confirmation_attempts")
        .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
        .eq("attempt_id", attemptId)
        .eq("status", "pending");
      if (error) throw error;
      return json({ status: "confirmed" });
    }

    const { data, error } = await admin
      .from("email_confirmation_attempts")
      .select("status")
      .eq("attempt_id", attemptId)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();
    if (error) throw error;

    // Unknown tokens are intentionally indistinguishable from pending ones.
    // The identifier is opaque and this endpoint must not become an account
    // enumeration oracle.
    return json({ status: data?.status === "confirmed" ? "confirmed" : "pending" });
  } catch (error) {
    console.error("email-confirmation-status error", error);
    return json({ error: "Nao foi possivel consultar a confirmacao" }, 500);
  }
});
