import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ACTIONS = new Set([
  "admin_deactivate_user",
  "admin_purge_user",
  "admin_reactivate_user",
  "calculate_slo_metrics",
  "check_error_alerts",
  "cleanup_error_logs",
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
        has_password: boolean;
        auth_methods: string[];
      }> = [];
      const { data: authCapabilities, error: authCapabilitiesError } = await supabase
        .rpc("internal_get_auth_methods", { p_user_id: null });
      if (authCapabilitiesError) throw authCapabilitiesError;
      const authCapabilitiesById = new Map(
        (authCapabilities ?? []).map((capability) => [capability.user_id, capability]),
      );
      let page = 1;
      const perPage = 1000;

      while (true) {
        const { data: pageData, error: pageError } = await supabase.auth.admin.listUsers({
          page,
          perPage,
        });

        if (pageError) throw pageError;

        users.push(...pageData.users.map((targetUser) => {
          const capability = authCapabilitiesById.get(targetUser.id);

          return {
            id: targetUser.id,
            email_confirmed_at: targetUser.email_confirmed_at ?? null,
            confirmed_at: targetUser.confirmed_at ?? null,
            has_password: capability?.has_password === true,
            auth_methods: capability?.providers ?? [],
          };
        }));

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

    // Keep account-state mutations in the edge function. The legacy dispatcher
    // relies on request.jwt.claims being visible through auth.uid() inside a
    // SECURITY DEFINER function, which is not guaranteed when the function is
    // invoked with the service-role client. That caused suspend/reactivate to
    // appear successful in the UI while the profile row stayed unchanged.
    if (action === "admin_deactivate_user" || action === "admin_reactivate_user") {
      const targetUserId = typeof args.target_user_id === "string" ? args.target_user_id : null;
      if (!targetUserId) return json({ error: "Usuario alvo obrigatorio" }, 400);

      const isActive = action === "admin_reactivate_user";
      const { data: updatedRows, error: updateError } = await supabase
        .from("profiles")
        .update({
          is_active: isActive,
          deactivated_at: isActive ? null : new Date().toISOString(),
          deactivated_by: isActive ? null : user.id,
        })
        .eq("id", targetUserId)
        .select("id");

      if (updateError) return json({ error: updateError.message, code: updateError.code }, 400);
      if (!updatedRows || updatedRows.length === 0) return json({ error: "Perfil do usuário não encontrado" }, 404);

      const { error: eventError } = await supabase.from("user_events").insert({
        user_id: targetUserId,
        event_type: isActive ? "ACCOUNT_REACTIVATED" : "ACCOUNT_DEACTIVATED",
        metadata: { admin_id: user.id },
      });
      if (eventError) return json({ error: eventError.message, code: eventError.code }, 400);

      return json({ data: null });
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
