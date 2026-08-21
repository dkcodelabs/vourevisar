import {
  BillingHttpError,
  createServiceClient,
  handleOptions,
  isUuid,
  jsonResponse,
  requireAuthenticatedUser,
  safeErrorCode,
  getStripeLivemode,
} from "../_shared/stripeBilling.ts";

type AdminBillingAction = "list" | "grant_manual_access" | "revoke_manual_access";
type PlanCode = "free_trial" | "monthly" | "annual";
type BillingSubscriptionRow = {
  user_id: string;
  billing_customer_id: string;
  plan_code: PlanCode;
  status: string;
  current_period_end: string | null;
  cancel_at: string | null;
  cancel_at_period_end: boolean;
  access_suspended_at: string | null;
  updated_at: string;
};
type BillingAccessGrantRow = {
  user_id: string;
  source: "trial" | "manual" | "goodwill" | "migration";
  plan_code: PlanCode;
  starts_at: string;
  ends_at: string;
  revoked_at: string | null;
  reason: string | null;
};

const ACTIVE_STRIPE_STATUSES = new Set(["active", "trialing", "past_due"]);
const GRANT_PRIORITY: Record<string, number> = {
  manual: 1,
  goodwill: 2,
  migration: 3,
  trial: 4,
};

const requireAdmin = async (userId: string, supabase: ReturnType<typeof createServiceClient>) => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["owner", "admin"]);

  if (error) throw error;
  if (!data?.length) throw new BillingHttpError(403, "admin_permission_required");
};

const isPlanCode = (value: unknown): value is PlanCode =>
  value === "free_trial" || value === "monthly" || value === "annual";

const manualAccessEnd = (plan: PlanCode, now: Date) => {
  const days = plan === "annual" ? 365 : plan === "monthly" ? 30 : 7;
  return new Date(now.getTime() + days * 86_400_000).toISOString();
};

const listBilling = async (supabase: ReturnType<typeof createServiceClient>) => {
  const now = new Date();
  const nowIso = now.toISOString();
  const livemode = getStripeLivemode();
  const [profilesResult, rolesResult, customersResult, subscriptionsResult, grantsResult] = await Promise.all([
    supabase.from("profiles").select("id, email, name, avatar_url").order("email"),
    supabase.from("user_roles").select("user_id, role"),
    supabase.from("billing_customers").select("id, user_id, updated_at").eq("livemode", livemode),
    supabase
      .from("billing_subscriptions")
      .select("user_id, billing_customer_id, plan_code, status, current_period_end, cancel_at, cancel_at_period_end, access_suspended_at, updated_at")
      .order("updated_at", { ascending: false }),
    supabase
      .from("billing_access_grants")
      .select("user_id, source, plan_code, starts_at, ends_at, revoked_at, reason")
      .is("revoked_at", null)
      .lte("starts_at", nowIso)
      .gt("ends_at", nowIso),
  ]);

  for (const result of [profilesResult, rolesResult, customersResult, subscriptionsResult, grantsResult]) {
    if (result.error) throw result.error;
  }

  const roles = new Map((rolesResult.data ?? []).map((row) => [row.user_id, row.role]));
  const currentCustomerByUser = new Map(
    (customersResult.data ?? []).map((row) => [row.user_id, row]),
  );
  const latestSubscription = new Map<string, BillingSubscriptionRow>();

  for (const subscription of subscriptionsResult.data ?? []) {
    const currentCustomer = currentCustomerByUser.get(subscription.user_id);
    // A customer mapping is replaced when the Stripe account changes. Older
    // subscriptions can still point to the same local customer row, so only
    // accept records written after the current mapping was established.
    if (
      !currentCustomer
      || subscription.billing_customer_id !== currentCustomer.id
      || new Date(subscription.updated_at).getTime() < new Date(currentCustomer.updated_at).getTime()
    ) continue;
    if (!latestSubscription.has(subscription.user_id)) {
      latestSubscription.set(subscription.user_id, subscription as BillingSubscriptionRow);
    }
  }

  const activeGrants = new Map<string, BillingAccessGrantRow[]>();
  for (const grant of grantsResult.data ?? []) {
    const current = activeGrants.get(grant.user_id) ?? [];
    current.push(grant as BillingAccessGrantRow);
    activeGrants.set(grant.user_id, current);
  }

  return (profilesResult.data ?? []).map((profile) => {
    const role = roles.get(profile.id) ?? "user";
    const subscription = latestSubscription.get(profile.id);
    const subscriptionEnd = subscription?.cancel_at && subscription.current_period_end
      ? new Date(Math.min(new Date(subscription.cancel_at).getTime(), new Date(subscription.current_period_end).getTime())).toISOString()
      : subscription?.cancel_at ?? subscription?.current_period_end ?? null;
    const stripeIsActive = Boolean(
      subscription
      && ACTIVE_STRIPE_STATUSES.has(subscription.status)
      && !subscription.access_suspended_at
      && subscriptionEnd
      && new Date(subscriptionEnd) > now,
    );
    const grant = (activeGrants.get(profile.id) ?? []).sort((left, right) => {
      const priority = (GRANT_PRIORITY[left.source] ?? 99) - (GRANT_PRIORITY[right.source] ?? 99);
      return priority || new Date(right.ends_at).getTime() - new Date(left.ends_at).getTime();
    })[0] ?? null;

    const source = stripeIsActive ? "stripe" : grant?.source ?? (subscription ? "stripe" : "none");
    const isActive = stripeIsActive || Boolean(grant);
    const plan = stripeIsActive ? subscription?.plan_code ?? "free_trial" : grant?.plan_code ?? "free_trial";
    const status = stripeIsActive ? subscription?.status ?? "inactive" : grant?.source === "trial" || grant?.plan_code === "free_trial" ? "trial" : grant ? "active" : subscription?.status ?? "inactive";
    const accessUntil = stripeIsActive ? subscriptionEnd : grant?.ends_at ?? subscriptionEnd;

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      avatar_url: profile.avatar_url,
      role,
      is_active: isActive,
      plan,
      status,
      access_until: accessUntil,
      source,
      cancel_at_period_end: Boolean(subscription?.cancel_at || subscription?.cancel_at_period_end),
      manual_access: grant?.source === "manual" ? {
        plan: grant.plan_code,
        ends_at: grant.ends_at,
        reason: grant.reason,
      } : null,
    };
  });
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return handleOptions(request);
  if (request.method !== "POST") return jsonResponse(request, { error: "method_not_allowed" }, 405);

  try {
    const supabase = createServiceClient();
    const actor = await requireAuthenticatedUser(request, supabase);
    await requireAdmin(actor.id, supabase);
    const livemode = getStripeLivemode();
    const body = await request.json().catch(() => ({})) as {
      action?: AdminBillingAction;
      userId?: unknown;
      plan?: unknown;
    };
    const action = body.action ?? "list";

    if (action === "list") return jsonResponse(request, { users: await listBilling(supabase) });

    if (!isUuid(body.userId)) throw new BillingHttpError(400, "invalid_target_user");
    if (action === "grant_manual_access") {
      if (!isPlanCode(body.plan)) throw new BillingHttpError(400, "invalid_manual_access_plan");

      const { data: currentCustomer, error: customerError } = await supabase
        .from("billing_customers")
        .select("id, updated_at")
        .eq("user_id", body.userId)
        .eq("livemode", livemode)
        .maybeSingle();
      if (customerError) throw customerError;

      const { data: activeSubscription, error: subscriptionError } = await supabase
        .from("billing_subscriptions")
        .select("id, status, current_period_end, cancel_at, access_suspended_at")
        .eq("user_id", body.userId)
        .eq("billing_customer_id", currentCustomer?.id ?? "00000000-0000-0000-0000-000000000000")
        .in("status", ["active", "trialing", "past_due"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (subscriptionError) throw subscriptionError;

      const effectiveEnd = activeSubscription?.cancel_at && activeSubscription.current_period_end
        ? Math.min(new Date(activeSubscription.cancel_at).getTime(), new Date(activeSubscription.current_period_end).getTime())
        : new Date(activeSubscription?.cancel_at ?? activeSubscription?.current_period_end ?? 0).getTime();
      if (activeSubscription && !activeSubscription.access_suspended_at && effectiveEnd > Date.now()) {
        throw new BillingHttpError(409, "stripe_subscription_active");
      }

      const now = new Date();
      const { error: revokeError } = await supabase
        .from("billing_access_grants")
        .update({ revoked_at: now.toISOString(), reason: "Cortesia administrativa substituída" })
        .eq("user_id", body.userId)
        .eq("source", "manual")
        .is("revoked_at", null);
      if (revokeError) throw revokeError;

      const { error: grantError } = await supabase.from("billing_access_grants").insert({
        user_id: body.userId,
        source: "manual",
        plan_code: body.plan,
        starts_at: now.toISOString(),
        ends_at: manualAccessEnd(body.plan, now),
        reason: "Cortesia administrativa",
        granted_by: actor.id,
      });
      if (grantError) throw grantError;
      return jsonResponse(request, { users: await listBilling(supabase) });
    }

    if (action === "revoke_manual_access") {
      const { error } = await supabase
        .from("billing_access_grants")
        .update({ revoked_at: new Date().toISOString(), reason: "Cortesia administrativa revogada" })
        .eq("user_id", body.userId)
        .eq("source", "manual")
        .is("revoked_at", null);
      if (error) throw error;
      return jsonResponse(request, { users: await listBilling(supabase) });
    }

    throw new BillingHttpError(400, "invalid_admin_billing_action");
  } catch (error) {
    const code = safeErrorCode(error);
    const status = error instanceof BillingHttpError ? error.status : 500;
    console.error("[admin-billing]", { code });
    return jsonResponse(request, { error: code }, status);
  }
});
