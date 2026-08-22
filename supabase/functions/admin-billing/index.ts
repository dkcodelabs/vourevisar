import Stripe from "npm:stripe@22.4.0";
import { sendWithdrawalResultEmail } from "../_shared/billingEmail.ts";
import { isBillingWithdrawalAdminEnabled } from "../_shared/billingContract.ts";
import { resolveBillingRefundReconciliationStatus } from "../_shared/billingRefundReconciliation.ts";
import {
  BillingHttpError,
  createServiceClient,
  createStripeClient,
  handleOptions,
  isUuid,
  jsonResponse,
  requireAuthenticatedUser,
  safeErrorCode,
  safeStripeErrorFingerprint,
  getStripeLivemode,
} from "../_shared/stripeBilling.ts";

type AdminBillingAction =
  | "list"
  | "grant_manual_access"
  | "revoke_manual_access"
  | "list_refund_requests"
  | "list_operation_timeline"
  | "reconcile_refund_request";
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

const listRefundRequests = async (
  supabase: ReturnType<typeof createServiceClient>,
  livemode: boolean,
) => {
  const { data: requests, error } = await supabase
    .from("billing_refund_requests")
    .select("id,user_id,status,subscription_cancel_status,requested_at,amount_cents,currency,error_code,processed_at,updated_at,processing_attempts,billing_contract_acceptances!inner(plan_code)")
    .eq("livemode", livemode)
    .order("requested_at", { ascending: false })
    .limit(100);
  if (error) throw error;

  const userIds = [...new Set((requests ?? []).map((row) => row.user_id))];
  const { data: profiles, error: profilesError } = userIds.length
    ? await supabase.from("profiles").select("id,email,name").in("id", userIds)
    : { data: [], error: null };
  if (profilesError) throw profilesError;
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return (requests ?? []).map((row) => {
    const profile = profileById.get(row.user_id);
    const acceptanceRelation = row.billing_contract_acceptances as unknown;
    const acceptance = Array.isArray(acceptanceRelation)
      ? acceptanceRelation[0] as { plan_code: string } | undefined
      : acceptanceRelation as { plan_code: string } | null;
    return {
      id: row.id,
      user_id: row.user_id,
      user_email: profile?.email ?? null,
      user_name: profile?.name ?? null,
      plan: acceptance?.plan_code ?? null,
      status: row.status,
      subscription_cancel_status: row.subscription_cancel_status,
      requested_at: row.requested_at,
      amount_cents: row.amount_cents,
      currency: row.currency,
      error_code: row.error_code,
      processed_at: row.processed_at,
      updated_at: row.updated_at,
      processing_attempts: row.processing_attempts,
    };
  });
};

type TimelineEventType =
  | "payment_confirmed"
  | "renewal_cancel_scheduled"
  | "subscription_canceled"
  | "withdrawal_requested"
  | "refund_succeeded"
  | "refund_pending"
  | "refund_failed"
  | "refund_manual_review"
  | "reconciliation_succeeded"
  | "reconciliation_no_change"
  | "reconciliation_failed";

type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  occurred_at: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  plan: "monthly" | "annual" | null;
  amount_cents: number | null;
  currency: string | null;
  status: string;
  error_code: string | null;
};

const listOperationTimeline = async (
  supabase: ReturnType<typeof createServiceClient>,
  livemode: boolean,
) => {
  const [customersResult, contractsResult, refundsResult, actionsResult] = await Promise.all([
    supabase.from("billing_customers").select("id").eq("livemode", livemode),
    supabase
      .from("billing_contract_acceptances")
      .select("id,user_id,plan_code,amount_cents,currency,contracted_at")
      .eq("livemode", livemode)
      .not("contracted_at", "is", null)
      .order("contracted_at", { ascending: false })
      .limit(100),
    supabase
      .from("billing_refund_requests")
      .select("id,user_id,billing_subscription_id,billing_contract_acceptance_id,status,requested_at,amount_cents,currency,error_code,processed_at,updated_at")
      .eq("livemode", livemode)
      .order("requested_at", { ascending: false })
      .limit(100),
    supabase
      .from("billing_refund_admin_actions")
      .select("id,billing_refund_request_id,status,request_status_before,request_status_after,error_code,created_at,finished_at")
      .eq("livemode", livemode)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  for (const result of [customersResult, contractsResult, refundsResult, actionsResult]) {
    if (result.error) throw result.error;
  }

  const customerIds = (customersResult.data ?? []).map((row) => row.id);
  const { data: subscriptions, error: subscriptionsError } = customerIds.length
    ? await supabase
      .from("billing_subscriptions")
      .select("id,user_id,billing_customer_id,plan_code,status,amount_cents,currency,cancel_at,cancel_at_period_end,canceled_at,updated_at")
      .in("billing_customer_id", customerIds)
      .order("updated_at", { ascending: false })
      .limit(100)
    : { data: [], error: null };
  if (subscriptionsError) throw subscriptionsError;

  const contractsById = new Map((contractsResult.data ?? []).map((contract) => [contract.id, contract]));
  const refundsById = new Map((refundsResult.data ?? []).map((refund) => [refund.id, refund]));
  const userIds = new Set<string>();
  for (const contract of contractsResult.data ?? []) userIds.add(contract.user_id);
  for (const refund of refundsResult.data ?? []) userIds.add(refund.user_id);
  for (const subscription of subscriptions ?? []) userIds.add(subscription.user_id);
  const { data: profiles, error: profilesError } = userIds.size
    ? await supabase.from("profiles").select("id,email,name").in("id", [...userIds])
    : { data: [], error: null };
  if (profilesError) throw profilesError;
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  const eventFor = (
    type: TimelineEventType,
    data: Omit<TimelineEvent, "type" | "user_email" | "user_name">,
  ): TimelineEvent => {
    const profile = profileById.get(data.user_id);
    return { ...data, type, user_email: profile?.email ?? null, user_name: profile?.name ?? null };
  };
  const events: TimelineEvent[] = [];

  for (const contract of contractsResult.data ?? []) {
    if (!contract.contracted_at) continue;
    events.push(eventFor("payment_confirmed", {
      id: `contract:${contract.id}`,
      occurred_at: contract.contracted_at,
      user_id: contract.user_id,
      plan: contract.plan_code,
      amount_cents: contract.amount_cents,
      currency: contract.currency,
      status: "confirmed",
      error_code: null,
    }));
  }

  for (const subscription of subscriptions ?? []) {
    if (subscription.status === "canceled") {
      events.push(eventFor("subscription_canceled", {
        id: `subscription-canceled:${subscription.id}`,
        occurred_at: subscription.canceled_at ?? subscription.updated_at,
        user_id: subscription.user_id,
        plan: subscription.plan_code === "annual" ? "annual" : "monthly",
        amount_cents: subscription.amount_cents,
        currency: subscription.currency,
        status: "canceled",
        error_code: null,
      }));
    } else if (subscription.cancel_at_period_end || subscription.cancel_at) {
      events.push(eventFor("renewal_cancel_scheduled", {
        id: `subscription-scheduled-cancel:${subscription.id}`,
        occurred_at: subscription.updated_at,
        user_id: subscription.user_id,
        plan: subscription.plan_code === "annual" ? "annual" : "monthly",
        amount_cents: subscription.amount_cents,
        currency: subscription.currency,
        status: "scheduled",
        error_code: null,
      }));
    }
  }

  for (const refund of refundsResult.data ?? []) {
    const contract = contractsById.get(refund.billing_contract_acceptance_id);
    const plan = contract?.plan_code === "annual" ? "annual" : contract?.plan_code === "monthly" ? "monthly" : null;
    events.push(eventFor("withdrawal_requested", {
      id: `withdrawal:${refund.id}`,
      occurred_at: refund.requested_at,
      user_id: refund.user_id,
      plan,
      amount_cents: refund.amount_cents,
      currency: refund.currency,
      status: refund.status,
      error_code: null,
    }));
    const terminalType: Record<string, TimelineEventType | undefined> = {
      succeeded: "refund_succeeded",
      pending: "refund_pending",
      failed: "refund_failed",
      manual_review: "refund_manual_review",
    };
    const outcomeType = terminalType[refund.status];
    if (outcomeType) {
      events.push(eventFor(outcomeType, {
        id: `refund:${refund.id}:${refund.status}`,
        occurred_at: refund.processed_at ?? refund.updated_at,
        user_id: refund.user_id,
        plan,
        amount_cents: refund.amount_cents,
        currency: refund.currency,
        status: refund.status,
        error_code: refund.error_code,
      }));
    }
  }

  for (const action of actionsResult.data ?? []) {
    const refund = refundsById.get(action.billing_refund_request_id);
    if (!refund || !action.finished_at) continue;
    const actionType: Record<string, TimelineEventType> = {
      succeeded: "reconciliation_succeeded",
      no_change: "reconciliation_no_change",
      failed: "reconciliation_failed",
    };
    events.push(eventFor(actionType[action.status] ?? "reconciliation_failed", {
      id: `reconciliation:${action.id}`,
      occurred_at: action.finished_at,
      user_id: refund.user_id,
      plan: contractsById.get(refund.billing_contract_acceptance_id)?.plan_code ?? null,
      amount_cents: refund.amount_cents,
      currency: refund.currency,
      status: action.request_status_after ?? action.request_status_before,
      error_code: action.error_code,
    }));
  }

  return events
    .sort((left, right) => new Date(right.occurred_at).getTime() - new Date(left.occurred_at).getTime())
    .slice(0, 200);
};

const cancelWithdrawalSubscription = async (
  supabase: ReturnType<typeof createServiceClient>,
  stripe: Stripe,
  requestRecord: {
    id: string;
    user_id: string;
    livemode: boolean;
    billing_subscription_id: string;
    billing_contract_acceptance_id: string;
  },
) => {
  const { data: localSubscription, error } = await supabase
    .from("billing_subscriptions")
    .select("stripe_subscription_id")
    .eq("id", requestRecord.billing_subscription_id)
    .eq("user_id", requestRecord.user_id)
    .maybeSingle();
  if (error) throw error;
  if (!localSubscription) throw new Error("admin_reconciliation_subscription_missing");

  const subscription = await stripe.subscriptions.retrieve(localSubscription.stripe_subscription_id);
  if (subscription.livemode !== requestRecord.livemode) {
    throw new Error("admin_reconciliation_mode_mismatch");
  }
  const canceledSubscription = subscription.status === "canceled"
    ? subscription
    : await stripe.subscriptions.cancel(
      subscription.id,
      { invoice_now: false, prorate: false },
      {
        idempotencyKey: `billing-withdrawal-cancel:v1:${requestRecord.livemode ? "live" : "test"}:${requestRecord.billing_contract_acceptance_id}`,
      },
    );

  const { error: syncError } = await supabase
    .from("billing_subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: canceledSubscription.cancel_at_period_end,
      cancel_at: canceledSubscription.cancel_at
        ? new Date(canceledSubscription.cancel_at * 1000).toISOString()
        : null,
      canceled_at: canceledSubscription.canceled_at
        ? new Date(canceledSubscription.canceled_at * 1000).toISOString()
        : new Date().toISOString(),
    })
    .eq("id", requestRecord.billing_subscription_id)
    .eq("user_id", requestRecord.user_id);
  if (syncError) throw syncError;
};

const sendReconciliationResultEmail = async (
  supabase: ReturnType<typeof createServiceClient>,
  requestRecord: {
    id: string;
    user_id: string;
    amount_cents: number;
    currency: string;
    requested_at: string;
    eligibility_deadline: string;
    result_email_status: string | null;
  },
  status: "succeeded" | "failed" | "manual_review",
) => {
  if (requestRecord.result_email_status === status) return;
  const { data, error } = await supabase.auth.admin.getUserById(requestRecord.user_id);
  if (error || !data.user?.email) throw error ?? new Error("refund_result_email_missing");

  await sendWithdrawalResultEmail({
    requestId: requestRecord.id,
    email: data.user.email,
    customerName: typeof data.user.user_metadata?.name === "string"
      ? data.user.user_metadata.name
      : null,
    amountCents: requestRecord.amount_cents,
    currency: requestRecord.currency,
    requestedAt: new Date(requestRecord.requested_at),
    deadline: new Date(requestRecord.eligibility_deadline),
    status,
  });
  const { error: updateError } = await supabase
    .from("billing_refund_requests")
    .update({
      result_email_sent_at: new Date().toISOString(),
      result_email_status: status,
    })
    .eq("id", requestRecord.id);
  if (updateError) throw updateError;
};

const reconcileRefundRequest = async (
  supabase: ReturnType<typeof createServiceClient>,
  actorId: string,
  livemode: boolean,
  refundRequestId: string,
  actionRequestId: string,
  reason: string,
) => {
  const { data: requestRecord, error: requestError } = await supabase
    .from("billing_refund_requests")
    .select("id,user_id,billing_subscription_id,billing_contract_acceptance_id,livemode,status,subscription_cancel_status,amount_cents,currency,stripe_payment_intent_id,stripe_refund_id,requested_at,eligibility_deadline,result_email_status,updated_at")
    .eq("id", refundRequestId)
    .eq("livemode", livemode)
    .maybeSingle();
  if (requestError) throw requestError;
  if (!requestRecord) throw new BillingHttpError(404, "refund_request_not_found");
  if (!["processing", "pending", "failed", "manual_review"].includes(requestRecord.status)) {
    throw new BillingHttpError(409, "refund_request_not_reconcilable");
  }
  const recoveryThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  if (requestRecord.status === "processing" && requestRecord.updated_at >= recoveryThreshold) {
    throw new BillingHttpError(409, "refund_reconciliation_too_early");
  }

  const { error: staleActionError } = await supabase
    .from("billing_refund_admin_actions")
    .update({
      status: "failed",
      error_code: "admin_reconciliation_lease_expired",
      finished_at: new Date().toISOString(),
    })
    .eq("billing_refund_request_id", requestRecord.id)
    .eq("status", "processing")
    .lt("started_at", recoveryThreshold);
  if (staleActionError) throw staleActionError;

  const { data: actionRecord, error: actionError } = await supabase
    .from("billing_refund_admin_actions")
    .insert({
      action_request_id: actionRequestId,
      billing_refund_request_id: requestRecord.id,
      actor_user_id: actorId,
      livemode,
      reason,
      request_status_before: requestRecord.status,
    })
    .select("id")
    .single();
  if (actionError?.code === "23505") {
    const { data: repeatedAction, error: repeatedActionError } = await supabase
      .from("billing_refund_admin_actions")
      .select("status")
      .eq("action_request_id", actionRequestId)
      .eq("actor_user_id", actorId)
      .maybeSingle();
    if (repeatedActionError) throw repeatedActionError;
    if (repeatedAction) return;
    throw new BillingHttpError(409, "refund_reconciliation_in_progress");
  }
  if (actionError) throw actionError;

  let actionStatus: "succeeded" | "no_change" | "failed" = "failed";
  let finalStatus = requestRecord.status;
  let actionErrorCode: string | null = null;
  try {
    const stripe = createStripeClient();
    let refund: Stripe.Refund | null = null;
    if (requestRecord.stripe_refund_id) {
      refund = await stripe.refunds.retrieve(requestRecord.stripe_refund_id);
    } else if (requestRecord.stripe_payment_intent_id) {
      const refunds = await stripe.refunds.list({
        payment_intent: requestRecord.stripe_payment_intent_id,
        limit: 100,
      });
      refund = refunds.data.find((candidate) =>
        candidate.metadata?.billing_refund_request_id === requestRecord.id
      ) ?? null;
    }

    let cancelStatus: "succeeded" | "failed" = "succeeded";
    try {
      await cancelWithdrawalSubscription(supabase, stripe, requestRecord);
    } catch (error) {
      cancelStatus = "failed";
      actionErrorCode = safeStripeErrorFingerprint(error, "admin_subscription_cancel");
    }

    const refundMatches = Boolean(
      refund &&
      refund.amount === requestRecord.amount_cents &&
      refund.currency === requestRecord.currency &&
      (!requestRecord.stripe_refund_id || refund.id === requestRecord.stripe_refund_id),
    );
    finalStatus = resolveBillingRefundReconciliationStatus({
      refundFound: Boolean(refund),
      refundMatches,
      cancellationSucceeded: cancelStatus === "succeeded",
      providerStatus: refund?.status ?? null,
    });
    actionErrorCode = actionErrorCode ?? (
      !refund
        ? "admin_reconciliation_refund_not_found"
        : !refundMatches
        ? "admin_reconciliation_refund_mismatch"
        : finalStatus === "failed"
        ? `refund_failed:${refund.failure_reason ?? "unknown"}`
        : null
    );

    const { error: updateError } = await supabase
      .from("billing_refund_requests")
      .update({
        stripe_refund_id: refundMatches ? refund!.id : requestRecord.stripe_refund_id,
        status: finalStatus,
        subscription_cancel_status: cancelStatus,
        error_code: actionErrorCode,
        processed_at: finalStatus === "succeeded" || finalStatus === "failed"
          ? new Date().toISOString()
          : null,
      })
      .eq("id", requestRecord.id)
      .eq("livemode", livemode);
    if (updateError) throw updateError;

    actionStatus = finalStatus === requestRecord.status && !refund
      ? "no_change"
      : "succeeded";
    if (["succeeded", "failed", "manual_review"].includes(finalStatus)) {
      try {
        await sendReconciliationResultEmail(
          supabase,
          requestRecord,
          finalStatus as "succeeded" | "failed" | "manual_review",
        );
      } catch (error) {
        actionErrorCode = actionErrorCode ?? safeErrorCode(error);
      }
    }
  } catch (error) {
    actionErrorCode = safeStripeErrorFingerprint(error, "admin_refund_reconciliation");
    throw error;
  } finally {
    const { error: finishError } = await supabase
      .from("billing_refund_admin_actions")
      .update({
        status: actionStatus,
        request_status_after: finalStatus,
        error_code: actionErrorCode,
        finished_at: new Date().toISOString(),
      })
      .eq("id", actionRecord.id);
    if (finishError) console.error("[admin-billing] reconciliation_audit_update_failed", {
      code: safeErrorCode(finishError),
    });
  }
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
      refundRequestId?: unknown;
      actionRequestId?: unknown;
      reason?: unknown;
    };
    const action = body.action ?? "list";

    if (action === "list") return jsonResponse(request, { users: await listBilling(supabase) });

    if (action === "list_refund_requests") {
      if (!isBillingWithdrawalAdminEnabled()) {
        throw new BillingHttpError(503, "withdrawal_admin_not_enabled");
      }
      return jsonResponse(request, {
        refundRequests: await listRefundRequests(supabase, livemode),
      });
    }

    if (action === "list_operation_timeline") {
      return jsonResponse(request, {
        livemode,
        events: await listOperationTimeline(supabase, livemode),
      });
    }

    if (action === "reconcile_refund_request") {
      if (!isBillingWithdrawalAdminEnabled()) {
        throw new BillingHttpError(503, "withdrawal_admin_not_enabled");
      }
      if (!isUuid(body.refundRequestId) || !isUuid(body.actionRequestId)) {
        throw new BillingHttpError(400, "invalid_refund_reconciliation_request");
      }
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (reason.length < 10 || reason.length > 500) {
        throw new BillingHttpError(400, "invalid_refund_reconciliation_reason");
      }
      await reconcileRefundRequest(
        supabase,
        actor.id,
        livemode,
        body.refundRequestId,
        body.actionRequestId,
        reason,
      );
      return jsonResponse(request, {
        refundRequests: await listRefundRequests(supabase, livemode),
      });
    }

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
