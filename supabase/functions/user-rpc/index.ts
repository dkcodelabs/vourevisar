import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ACTIONS = new Set([
  "atomic_archive_edital_from_cycle",
  "atomic_cycle_load",
  "reset_edital_study_progress",
  "get_subscription_info",
  "get_unified_subject_name",
  "get_unified_topic_name",
  "get_user_ai_limits",
  "log_admin_error",
  "log_user_event",
  "sync_topic_merge_progress",
]);

type UserRpcRequest = {
  action?: string;
  args?: Record<string, unknown>;
};

const getString = (args: Record<string, unknown>, key: string): string =>
  typeof args[key] === "string" ? String(args[key]) : "";

const actorMatches = (args: Record<string, unknown>, userId: string, keys: string[]): boolean =>
  keys.every((key) => {
    const value = args[key];
    return value === undefined || value === null || value === userId;
  });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Nao autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Configuracao Supabase ausente");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (userError || !user) return json({ error: "Sessao invalida" }, 401);

    const { action, args = {} } = (await req.json()) as UserRpcRequest;
    if (!action || !ALLOWED_ACTIONS.has(action)) {
      return json({ error: "Acao de usuario nao permitida" }, 400);
    }

    if (!isAuthorizedForAction(action, args, user.id)) {
      return json({ error: "RPC nao pertence ao usuario autenticado" }, 403);
    }

    const { data, error } = await supabase.rpc("user_rpc_dispatch", {
      p_action: action,
      p_args: args,
      p_actor_user_id: user.id,
    });

    if (error) return json({ error: error.message, code: error.code }, 400);

    return json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return json({ error: message }, 500);
  }
});

function isAuthorizedForAction(action: string, args: Record<string, unknown>, userId: string): boolean {
  switch (action) {
    case "atomic_archive_edital_from_cycle":
    case "atomic_cycle_load":
    case "reset_edital_study_progress":
    case "sync_topic_merge_progress":
      return getString(args, "p_user_id") === userId;
    case "get_subscription_info":
      return !args.check_user_id || args.check_user_id === userId;
    case "get_unified_subject_name":
    case "get_unified_topic_name":
      return getString(args, "user_id") === userId;
    case "get_user_ai_limits":
      return getString(args, "p_user_id") === userId;
    case "log_admin_error":
      return actorMatches(args, userId, ["p_actor_user_id"]);
    case "log_user_event":
      return actorMatches(args, userId, ["p_target_user_id", "p_actor_user_id"]);
    default:
      return false;
  }
}

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
