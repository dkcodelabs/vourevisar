import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ACTIONS = new Set([
  "activate_paid_subscription",
  "activate_trial_subscription",
  "admin_deactivate_user",
  "admin_purge_user",
  "admin_reactivate_user",
  "calculate_slo_metrics",
  "check_error_alerts",
  "cleanup_error_logs",
  "deactivate_subscription",
  "get_all_user_roles_admin",
  "get_auth_user_statuses",
  "get_user_ai_limits_admin",
  "reset_user_ai_quota",
  "get_audit_logs",
  "get_users_by_edital_source",
  "remove_user_role_admin",
  "set_user_role",
]);

type AdminRpcRequest = {
  action?: string;
  args?: Record<string, unknown>;
};

const MANUAL_SUBSCRIPTION_ACTIONS = new Set([
  "activate_paid_subscription",
  "activate_trial_subscription",
  "deactivate_subscription",
]);

const deactivateExternalSubscriptionIfActive = async (
  supabase: ReturnType<typeof createClient>,
  targetUserId: string,
) => {
  const { data: subscription, error } = await supabase
    .from("user_subscriptions")
    .select("asaas_subscription_id")
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (error) throw error;
  if (!subscription?.asaas_subscription_id) return;

  const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
  if (!asaasApiKey) return;

  const asaasUrl = Deno.env.get("ASAAS_API_URL") || "https://api-sandbox.asaas.com/v3";
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "vourevisar/1.0 (Supabase Edge Function)",
    access_token: asaasApiKey,
  };
  const currentResponse = await fetch(`${asaasUrl}/subscriptions/${subscription.asaas_subscription_id}`, { headers });
  const currentBody = await currentResponse.json().catch(() => ({}));
  if (!currentResponse.ok) {
    throw new Error(`Nao foi possivel consultar a assinatura externa antes da concessao (${currentResponse.status})`);
  }
  if (currentBody.status !== "ACTIVE") return;

  const updateResponse = await fetch(`${asaasUrl}/subscriptions/${subscription.asaas_subscription_id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ status: "INACTIVE" }),
  });
  if (!updateResponse.ok) {
    throw new Error(`Nao foi possivel encerrar a recorrencia externa (${updateResponse.status})`);
  }
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Nao autorizado" }, 401);
    }

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
    if (userError || !user) {
      return json({ error: "Sessao invalida" }, 401);
    }

    const { action, args = {} } = (await req.json()) as AdminRpcRequest;
    if (!action || !ALLOWED_ACTIONS.has(action)) {
      return json({ error: "Acao administrativa nao permitida" }, 400);
    }

    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "owner"]);

    if (roleError) throw roleError;
    if (!roleRows || roleRows.length === 0) {
      return json({ error: "Permissao administrativa obrigatoria" }, 403);
    }

    if (action === "get_auth_user_statuses") {
      const users: Array<{
        id: string;
        email_confirmed_at: string | null;
        confirmed_at: string | null;
      }> = [];
      let page = 1;
      const perPage = 1000;

      while (true) {
        const { data: pageData, error: pageError } = await supabase.auth.admin.listUsers({
          page,
          perPage,
        });

        if (pageError) throw pageError;

        users.push(...pageData.users.map((targetUser) => ({
          id: targetUser.id,
          email_confirmed_at: targetUser.email_confirmed_at ?? null,
          confirmed_at: targetUser.confirmed_at ?? null,
        })));

        if (pageData.users.length < perPage) break;
        page += 1;
      }

      return json({ data: users });
    }

    if (action === "get_user_ai_limits_admin") {
      const targetUserId = typeof args.target_user_id === "string" ? args.target_user_id : null;
      if (!targetUserId) return json({ error: "Usuario alvo obrigatorio" }, 400);

      const { data, error } = await supabase.rpc("get_user_ai_limits", {
        p_user_id: targetUserId,
      });
      if (error) return json({ error: error.message, code: error.code }, 400);
      return json({ data });
    }

    if (action === "reset_user_ai_quota") {
      const targetUserId = typeof args.target_user_id === "string" ? args.target_user_id : null;
      if (!targetUserId) return json({ error: "Usuario alvo obrigatorio" }, 400);

      const { data, error } = await supabase.rpc("reset_user_ai_quota", {
        p_user_id: targetUserId,
      });
      if (error) return json({ error: error.message, code: error.code }, 400);
      return json({ data });
    }

    if (MANUAL_SUBSCRIPTION_ACTIONS.has(action)) {
      const targetUserId = typeof args.target_user_id === "string" ? args.target_user_id : null;
      if (!targetUserId) return json({ error: "Usuario alvo obrigatorio" }, 400);
      await deactivateExternalSubscriptionIfActive(supabase, targetUserId);
    }

    const { data, error } = await supabase.rpc("admin_rpc_dispatch", {
      p_action: action,
      p_args: args,
      p_actor_user_id: user.id,
    });
    if (error) {
      return json({ error: error.message, code: error.code }, 400);
    }

    if (action === "activate_trial_subscription" || action === "activate_paid_subscription" || action === "deactivate_subscription") {
      const targetUserId = typeof args.target_user_id === "string" ? args.target_user_id : null;
      if (!targetUserId) return json({ error: "Usuario alvo obrigatorio" }, 400);

      const now = new Date();
      const manualPayload = action === "deactivate_subscription"
        ? {
            manual_access_until: null,
            manual_access_plan: null,
            manual_access_reason: null,
            manual_access_granted_at: null,
          }
        : action === "activate_trial_subscription"
          ? {
              manual_access_until: new Date(now.getTime() + (Number(args.trial_days) || 7) * 86400000).toISOString(),
              manual_access_plan: "free_trial",
              manual_access_reason: "Concessao administrativa",
              manual_access_granted_at: now.toISOString(),
            }
          : {
              manual_access_until: new Date(now.getTime() + (String(args.plan_type) === "annual" ? 365 : 30) * 86400000).toISOString(),
              manual_access_plan: String(args.plan_type) === "annual" ? "annual" : "monthly",
              manual_access_reason: "Concessao administrativa",
              manual_access_granted_at: now.toISOString(),
            };

      const { error: manualAccessError } = await supabase
        .from("user_subscriptions")
        .upsert({ user_id: targetUserId, ...manualPayload }, { onConflict: "user_id" });
      if (manualAccessError) throw manualAccessError;
    }

    return json({ data, manualAccessIndependent: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return json({ error: message }, 500);
  }
});

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
