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
  "get_audit_logs",
  "get_users_by_edital_source",
  "remove_user_role_admin",
  "set_user_role",
]);

const MANUAL_SUBSCRIPTION_ACTIONS = new Set([
  "activate_paid_subscription",
  "activate_trial_subscription",
  "deactivate_subscription",
]);

type AdminRpcRequest = {
  action?: string;
  args?: Record<string, unknown>;
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

    if (MANUAL_SUBSCRIPTION_ACTIONS.has(action)) {
      const targetUserId = typeof args.target_user_id === "string" ? args.target_user_id : null;
      if (!targetUserId) {
        return json({ error: "Usuario alvo obrigatorio para alterar assinatura" }, 400);
      }

      const { data: targetSubscription, error: targetSubscriptionError } = await supabase
        .from("user_subscriptions")
        .select("asaas_subscription_id")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (targetSubscriptionError) throw targetSubscriptionError;
      if (targetSubscription?.asaas_subscription_id) {
        return json({
          error: "Esta assinatura e gerenciada pelo Asaas. Altere o plano no Asaas e aguarde a sincronizacao.",
          code: "ASAAS_SUBSCRIPTION_MANAGED_EXTERNALLY",
        }, 409);
      }
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

    const { data, error } = await supabase.rpc("admin_rpc_dispatch", {
      p_action: action,
      p_args: args,
      p_actor_user_id: user.id,
    });
    if (error) {
      return json({ error: error.message, code: error.code }, 400);
    }

    return json({ data });
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
