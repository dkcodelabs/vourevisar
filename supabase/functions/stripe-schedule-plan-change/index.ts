import Stripe from "npm:stripe@22.4.0";
import {
  BillingHttpError,
  createServiceClient,
  createStripeClient,
  getPlanFromPriceId,
  getPlanPriceId,
  getStripeLivemode,
  handleOptions,
  isUuid,
  jsonResponse,
  requireAuthenticatedUser,
  safeErrorCode,
} from "../_shared/stripeBilling.ts";
import { getBillingContractDocuments } from "../_shared/billingContract.ts";
import { sendBillingOperationsAlert } from "../_shared/billingEmail.ts";

type PlanChangeAction = "schedule_annual" | "cancel_scheduled_change";

const PLAN_CHANGE_IDEMPOTENCY_VERSION = "v1";

const getExpandableId = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") {
    return value.id;
  }
  return null;
};

const isPlanChangeEnabled = () =>
  Deno.env.get("BILLING_PLAN_CHANGE_ENABLED")?.trim().toLowerCase() === "true";

const toIso = (value: number) => new Date(value * 1000).toISOString();

const getPlanChangeErrorStatus = (error: unknown) =>
  error instanceof BillingHttpError ? error.status : 500;

const requirePlanChangeDocuments = async (body: Record<string, unknown>) => {
  const documents = await getBillingContractDocuments();
  if (
    body.termsVersion !== documents.termsVersion ||
    body.privacyVersion !== documents.privacyVersion ||
    body.refundPolicyVersion !== documents.refundPolicyVersion
  ) {
    throw new BillingHttpError(409, "plan_change_contract_version_outdated");
  }
  return documents;
};

const getCurrentMonthlySubscription = async (
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  livemode: boolean,
) => {
  const { data: customer, error: customerError } = await supabase
    .from("billing_customers")
    .select("id,updated_at")
    .eq("user_id", userId)
    .eq("livemode", livemode)
    .maybeSingle();
  if (customerError) throw customerError;
  if (!customer) throw new BillingHttpError(404, "plan_change_subscription_not_found");

  const { data: subscription, error: subscriptionError } = await supabase
    .from("billing_subscriptions")
    .select("id,stripe_subscription_id,stripe_price_id,plan_code,status,current_period_end,cancel_at_period_end,cancel_at,stripe_schedule_id")
    .eq("user_id", userId)
    .eq("billing_customer_id", customer.id)
    .gte("updated_at", customer.updated_at)
    .in("status", ["active", "trialing", "past_due"])
    .gt("current_period_end", new Date().toISOString())
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (subscriptionError) throw subscriptionError;
  if (!subscription || subscription.plan_code !== "monthly") {
    throw new BillingHttpError(409, "plan_change_monthly_subscription_required");
  }
  if (subscription.cancel_at_period_end || subscription.cancel_at) {
    throw new BillingHttpError(409, "plan_change_renewal_already_canceled");
  }
  return subscription;
};

const releaseScheduledChange = async (
  supabase: ReturnType<typeof createServiceClient>,
  stripe: Stripe,
  userId: string,
  livemode: boolean,
) => {
  const subscription = await getCurrentMonthlySubscription(supabase, userId, livemode);
  const { data: change, error: changeError } = await supabase
    .from("billing_plan_change_requests")
    .select("id,stripe_schedule_id,effective_at,status")
    .eq("billing_subscription_id", subscription.id)
    .eq("user_id", userId)
    .eq("livemode", livemode)
    .eq("status", "scheduled")
    .maybeSingle();
  if (changeError) throw changeError;
  if (!change?.stripe_schedule_id) {
    throw new BillingHttpError(409, "plan_change_not_scheduled");
  }

  const schedule = await stripe.subscriptionSchedules.retrieve(change.stripe_schedule_id);
  if (schedule.livemode !== livemode) throw new BillingHttpError(409, "plan_change_mode_mismatch");
  if (schedule.status !== "active" && schedule.status !== "not_started") {
    throw new BillingHttpError(409, "plan_change_not_reversible");
  }

  await stripe.subscriptionSchedules.release(
    schedule.id,
    {},
    { idempotencyKey: `billing-plan-change:release:${PLAN_CHANGE_IDEMPOTENCY_VERSION}:${livemode ? "live" : "test"}:${change.id}` },
  );

  const now = new Date().toISOString();
  const { error: changeUpdateError } = await supabase
    .from("billing_plan_change_requests")
    .update({ status: "canceled", canceled_at: now, error_code: null })
    .eq("id", change.id)
    .eq("status", "scheduled");
  if (changeUpdateError) throw changeUpdateError;

  const { error: subscriptionUpdateError } = await supabase
    .from("billing_subscriptions")
    .update({ scheduled_plan_code: null, stripe_schedule_id: null })
    .eq("id", subscription.id)
    .eq("user_id", userId);
  if (subscriptionUpdateError) throw subscriptionUpdateError;

  try {
    await sendBillingOperationsAlert({
      eventKey: `plan-change-canceled:${change.id}`,
      title: "Troca para plano anual desfeita pelo cliente",
      details: [{ label: "Plano atual", value: "Mensal permanece ativo" }],
    });
  } catch (error) {
    console.error("[stripe-schedule-plan-change] operations_alert_failed", { code: safeErrorCode(error) });
  }

  return { scheduled: false, effectiveAt: change.effective_at };
};

const scheduleAnnualPlanChange = async (
  request: Request,
  body: Record<string, unknown>,
) => {
  const requestId = body.requestId;
  if (!isUuid(requestId)) throw new BillingHttpError(400, "invalid_plan_change_request");

  const documents = await requirePlanChangeDocuments(body);
  const supabase = createServiceClient();
  const user = await requireAuthenticatedUser(request, supabase);
  const livemode = getStripeLivemode();
  const subscription = await getCurrentMonthlySubscription(supabase, user.id, livemode);

  const { data: existingRequest, error: existingRequestError } = await supabase
    .from("billing_plan_change_requests")
    .select("id,status,effective_at,stripe_schedule_id")
    .eq("request_id", requestId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingRequestError) throw existingRequestError;
  if (existingRequest?.status === "scheduled") {
    return { scheduled: true, reused: true, effectiveAt: existingRequest.effective_at };
  }
  if (existingRequest && existingRequest.status !== "creating") {
    throw new BillingHttpError(409, "plan_change_request_not_open");
  }

  const stripe = createStripeClient();
  const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
  if (
    stripeSubscription.livemode !== livemode ||
    stripeSubscription.metadata.supabase_user_id !== user.id ||
    stripeSubscription.cancel_at_period_end ||
    stripeSubscription.cancel_at
  ) {
    throw new BillingHttpError(409, "plan_change_subscription_mismatch");
  }
  const subscriptionItem = stripeSubscription.items.data[0];
  if (
    stripeSubscription.items.data.length !== 1 ||
    !subscriptionItem ||
    getPlanFromPriceId(subscriptionItem.price.id) !== "monthly" ||
    !subscriptionItem.current_period_end
  ) {
    throw new BillingHttpError(409, "plan_change_subscription_unsupported");
  }
  const effectiveAt = toIso(subscriptionItem.current_period_end);
  if (new Date(effectiveAt).getTime() <= Date.now()) {
    throw new BillingHttpError(409, "plan_change_period_unavailable");
  }

  let changeId = existingRequest?.id as string | undefined;
  let scheduleId = existingRequest?.stripe_schedule_id ?? null;
  if (!changeId) {
    const { data: createdChange, error: createChangeError } = await supabase
      .from("billing_plan_change_requests")
      .insert({
        request_id: requestId,
        user_id: user.id,
        billing_subscription_id: subscription.id,
        livemode,
        effective_at: effectiveAt,
        terms_version: documents.termsVersion,
        privacy_version: documents.privacyVersion,
        refund_policy_version: documents.refundPolicyVersion,
        terms_sha256: documents.termsSha256,
        refund_policy_sha256: documents.refundPolicySha256,
      })
      .select("id")
      .single();
    if (createChangeError?.code === "23505") {
      throw new BillingHttpError(409, "plan_change_request_in_progress");
    }
    if (createChangeError) throw createChangeError;
    changeId = createdChange.id;
  }
  if (!changeId) throw new BillingHttpError(500, "plan_change_request_missing");

  let releaseScheduleOnFailure = Boolean(scheduleId && existingRequest?.status === "creating");
  try {
    const attachedScheduleId = getExpandableId(stripeSubscription.schedule);
    if (attachedScheduleId && attachedScheduleId !== scheduleId) {
      throw new BillingHttpError(409, "plan_change_conflict");
    }

    let schedule: Stripe.SubscriptionSchedule;
    if (scheduleId) {
      schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
      if (schedule.livemode !== livemode) throw new BillingHttpError(409, "plan_change_mode_mismatch");
    } else {
      schedule = await stripe.subscriptionSchedules.create(
        { from_subscription: stripeSubscription.id },
        { idempotencyKey: `billing-plan-change:create:${PLAN_CHANGE_IDEMPOTENCY_VERSION}:${livemode ? "live" : "test"}:${stripeSubscription.id}:${requestId}` },
      );
      releaseScheduleOnFailure = true;
      scheduleId = schedule.id;
      const { error: scheduleReferenceError } = await supabase
        .from("billing_plan_change_requests")
        .update({ stripe_schedule_id: schedule.id })
        .eq("id", changeId)
        .eq("status", "creating");
      if (scheduleReferenceError) throw scheduleReferenceError;
    }

    const currentPhase = schedule.phases.find((phase) =>
      phase.start_date <= subscriptionItem.current_period_end &&
      phase.end_date !== null &&
      phase.end_date >= subscriptionItem.current_period_end
    );
    const currentPhaseEnd = currentPhase?.end_date;
    const currentPhaseStart = currentPhase?.start_date;
    const currentPriceId = currentPhase?.items[0] ? getExpandableId(currentPhase.items[0].price) : null;
    if (
      !currentPhase ||
      !currentPriceId ||
      currentPhase.items.length !== 1 ||
      !currentPhaseStart ||
      !currentPhaseEnd ||
      currentPhaseEnd !== subscriptionItem.current_period_end
    ) {
      throw new BillingHttpError(409, "plan_change_schedule_mismatch");
    }

    const annualPriceId = getPlanPriceId("annual");
    await stripe.subscriptionSchedules.update(
      schedule.id,
      {
        end_behavior: "release",
        proration_behavior: "none",
        metadata: {
          billing_plan_change_request_id: changeId,
          supabase_user_id: user.id,
        },
        phases: [
          {
            items: [{ price: currentPriceId, quantity: currentPhase.items[0].quantity ?? 1 }],
            start_date: currentPhaseStart,
            end_date: currentPhaseEnd,
            proration_behavior: "none",
          },
          {
            items: [{ price: annualPriceId, quantity: 1 }],
            start_date: currentPhaseEnd,
            duration: { interval: "year", interval_count: 1 },
            proration_behavior: "none",
            metadata: {
              plan_code: "annual",
              billing_plan_change_request_id: changeId,
              supabase_user_id: user.id,
            },
          },
        ],
      },
      { idempotencyKey: `billing-plan-change:update:${PLAN_CHANGE_IDEMPOTENCY_VERSION}:${livemode ? "live" : "test"}:${schedule.id}:${requestId}` },
    );

    const { error: subscriptionUpdateError } = await supabase
      .from("billing_subscriptions")
      .update({ scheduled_plan_code: "annual", stripe_schedule_id: schedule.id })
      .eq("id", subscription.id)
      .eq("user_id", user.id);
    if (subscriptionUpdateError) throw subscriptionUpdateError;

    const now = new Date().toISOString();
    const { error: scheduleChangeError } = await supabase
      .from("billing_plan_change_requests")
      .update({ status: "scheduled", scheduled_at: now, error_code: null })
      .eq("id", changeId)
      .eq("status", "creating");
    if (scheduleChangeError) throw scheduleChangeError;

    try {
      await sendBillingOperationsAlert({
        eventKey: `plan-change-scheduled:${changeId}`,
        title: "Troca para plano anual agendada",
        details: [{ label: "Vigência", value: effectiveAt }],
      });
    } catch (error) {
      console.error("[stripe-schedule-plan-change] operations_alert_failed", { code: safeErrorCode(error) });
    }

    return { scheduled: true, reused: false, effectiveAt };
  } catch (error) {
    if (releaseScheduleOnFailure && scheduleId) {
      try {
        await stripe.subscriptionSchedules.release(scheduleId);
        await supabase
          .from("billing_subscriptions")
          .update({ scheduled_plan_code: null, stripe_schedule_id: null })
          .eq("id", subscription.id)
          .eq("user_id", user.id);
      } catch (releaseError) {
        console.error("[stripe-schedule-plan-change] schedule_release_after_failure_failed", {
          code: safeErrorCode(releaseError),
        });
      }
    }
    await supabase
      .from("billing_plan_change_requests")
      .update({ status: "failed", error_code: safeErrorCode(error) })
      .eq("id", changeId);
    throw error;
  }
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return handleOptions(request);
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }

  try {
    if (!isPlanChangeEnabled()) {
      throw new BillingHttpError(503, "plan_change_not_enabled");
    }
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const action = body?.action as PlanChangeAction | undefined;
    if (!body || (action !== "schedule_annual" && action !== "cancel_scheduled_change")) {
      throw new BillingHttpError(400, "invalid_plan_change_request");
    }

    if (action === "schedule_annual") {
      return jsonResponse(request, await scheduleAnnualPlanChange(request, body));
    }

    const supabase = createServiceClient();
    const user = await requireAuthenticatedUser(request, supabase);
    const result = await releaseScheduledChange(supabase, createStripeClient(), user.id, getStripeLivemode());
    return jsonResponse(request, result);
  } catch (error) {
    const code = safeErrorCode(error);
    console.error("[stripe-schedule-plan-change]", { code });
    return jsonResponse(request, { error: code }, getPlanChangeErrorStatus(error));
  }
});
