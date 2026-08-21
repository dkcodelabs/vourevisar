import {
  BillingHttpError,
  createServiceClient,
  createStripeClient,
  getAppUrl,
  getStripeLivemode,
  getPlanPriceId,
  handleOptions,
  isBillingPlanCode,
  isUuid,
  jsonResponse,
  requireAuthenticatedUser,
  resolveBillingCustomer,
  safeErrorCode,
  safeStripeErrorDetails,
  safeStripeErrorFingerprint,
} from "../_shared/stripeBilling.ts";

// A Stripe idempotency key is valid only for an identical request payload.
// Keep this version tied to the Checkout contract and include the resolved
// customer below: customer IDs are Stripe-account scoped, so Test and Live
// must never reuse the same key after an account/mode switch.
const CHECKOUT_IDEMPOTENCY_VERSION = "elements-v4";

const isMissingStripeSession = (error: unknown) =>
  safeStripeErrorDetails(error)?.code === "resource_missing";

const isReusableCheckoutSession = (session: {
  status: string | null;
  client_secret: string | null;
  phone_number_collection?: { enabled?: boolean } | null;
  billing_address_collection?: "auto" | "required" | null;
}) =>
  session.status === "open" &&
  Boolean(session.client_secret) &&
  session.phone_number_collection?.enabled !== true &&
  // The current custom Payment Element has no Address Element. A session that
  // requires billing address confirmation cannot be completed by this UI.
  session.billing_address_collection !== "required";

const closeStaleAttempt = async (
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  requestId: string,
  errorCode = "checkout_session_unavailable",
) => {
  const { error } = await supabase
    .from("billing_checkout_attempts")
    .update({ status: "failed", error_code: errorCode })
    .eq("user_id", userId)
    .eq("request_id", requestId);
  if (error) throw error;
};

Deno.serve(async (request) => {
  let attemptToFail: { userId: string; requestId: string } | null = null;
  let stage = "request";

  if (request.method === "OPTIONS") return handleOptions(request);
  if (request.method !== "POST") return jsonResponse(request, { error: "method_not_allowed" }, 405);

  try {
    stage = "authentication";
    const supabase = createServiceClient();
    const user = await requireAuthenticatedUser(request, supabase);
    const payload = await request.json().catch(() => null);
    const plan = payload?.plan;
    const requestId = payload?.requestId;

    if (!isBillingPlanCode(plan) || !isUuid(requestId)) {
      throw new BillingHttpError(400, "invalid_checkout_request");
    }

    const livemode = getStripeLivemode();

    stage = "subscription_guard";
    // A user can have subscriptions from a previous Stripe account/customer
    // generation. They remain immutable history, but must not block a new
    // checkout after the current billing customer has changed.
    const { data: currentBillingCustomer, error: currentCustomerError } = await supabase
      .from("billing_customers")
      .select("id,updated_at")
      .eq("user_id", user.id)
      .eq("livemode", livemode)
      .maybeSingle();

    if (currentCustomerError) throw currentCustomerError;

    const subscriptionGuardQuery = supabase
      .from("billing_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .gt("current_period_end", new Date().toISOString())
      .limit(1);

    const { data: paidSubscriptions, error: paidSubscriptionError } =
      currentBillingCustomer
        ? await subscriptionGuardQuery
            .eq("billing_customer_id", currentBillingCustomer.id)
            .gte("updated_at", currentBillingCustomer.updated_at)
        : { data: [], error: null };

    if (paidSubscriptionError) throw paidSubscriptionError;
    if (paidSubscriptions?.length) {
      throw new BillingHttpError(409, "subscription_already_active");
    }

    const stripe = createStripeClient();
    const priceId = getPlanPriceId(plan);

    stage = "attempt_lookup";
    const { data: openAttempt } = await supabase
      .from("billing_checkout_attempts")
      .select("request_id,stripe_checkout_session_id")
      .eq("user_id", user.id)
      .eq("plan_code", plan)
      .in("status", ["creating", "open"])
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openAttempt?.stripe_checkout_session_id) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(
          openAttempt.stripe_checkout_session_id,
        );
        if (isReusableCheckoutSession(existingSession)) {
          return jsonResponse(request, {
            clientSecret: existingSession.client_secret!,
            reused: true,
          });
        }
        await closeStaleAttempt(
          supabase,
          user.id,
          openAttempt.request_id,
          "checkout_session_schema_outdated",
        );
      } catch (error) {
        // Attempts created with another Stripe account/mode are immutable
        // history, but cannot be retrieved with the current key. Do not let
        // one stale row block a fresh checkout.
        if (!isMissingStripeSession(error)) throw error;
        await closeStaleAttempt(supabase, user.id, openAttempt.request_id);
      }
    }

    stage = "attempt_create";
    const { error: attemptError } = await supabase
      .from("billing_checkout_attempts")
      .insert({
        user_id: user.id,
        request_id: requestId,
        plan_code: plan,
        status: "creating",
      });

    if (attemptError?.code === "23505") {
      const { data: repeatedAttempt } = await supabase
        .from("billing_checkout_attempts")
        .select("status,stripe_checkout_session_id")
        .eq("request_id", requestId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (repeatedAttempt?.stripe_checkout_session_id) {
        try {
          const repeatedSession = await stripe.checkout.sessions.retrieve(
            repeatedAttempt.stripe_checkout_session_id,
          );
          if (isReusableCheckoutSession(repeatedSession)) {
            return jsonResponse(request, {
              clientSecret: repeatedSession.client_secret!,
              reused: true,
            });
          }
        } catch (error) {
          if (!isMissingStripeSession(error)) throw error;
        }
      }

      if (repeatedAttempt?.status === "creating") {
        throw new BillingHttpError(409, "checkout_request_in_progress");
      }

      const { error: resetAttemptError } = await supabase
        .from("billing_checkout_attempts")
        .update({
          status: "creating",
          stripe_checkout_session_id: null,
          expires_at: null,
          error_code: null,
        })
        .eq("request_id", requestId)
        .eq("user_id", user.id);

      if (resetAttemptError) throw resetAttemptError;
      attemptToFail = { userId: user.id, requestId };
    } else if (!attemptError) {
      attemptToFail = { userId: user.id, requestId };
    }
    if (attemptError && attemptError.code !== "23505") throw attemptError;

    stage = "customer_lookup";
    const { data: customerRecord, error: customerLookupError } = await supabase
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .eq("livemode", livemode)
      .maybeSingle();

    if (customerLookupError) throw customerLookupError;

    stage = "customer_reconcile";
    const customerId = await resolveBillingCustomer(
      supabase,
      stripe,
      user,
      livemode,
      customerRecord?.stripe_customer_id,
    );

    stage = "checkout_session_create";
    const appUrl = getAppUrl();
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        ui_mode: "elements",
        customer: customerId,
        client_reference_id: user.id,
        // Stripe selects eligible methods from the Dashboard configuration.
        line_items: [{ price: priceId, quantity: 1 }],
        billing_address_collection: "auto",
        return_url: `${appUrl}/checkout/retorno?session_id={CHECKOUT_SESSION_ID}`,
        metadata: {
          supabase_user_id: user.id,
          plan_code: plan,
          request_id: requestId,
        },
        subscription_data: {
          metadata: {
            supabase_user_id: user.id,
            plan_code: plan,
            request_id: requestId,
          },
        },
      },
      {
        idempotencyKey:
          `billing-checkout:${CHECKOUT_IDEMPOTENCY_VERSION}:${user.id}:${customerId}:${requestId}`,
      },
    );

    if (!session.client_secret) {
      throw new BillingHttpError(502, "stripe_client_secret_missing");
    }

    stage = "attempt_open";
    const { error: attemptUpdateError } = await supabase
      .from("billing_checkout_attempts")
      .update({
        stripe_checkout_session_id: session.id,
        status: "open",
        expires_at: new Date(session.expires_at * 1000).toISOString(),
      })
      .eq("request_id", requestId)
      .eq("user_id", user.id);

    if (attemptUpdateError) throw attemptUpdateError;
    attemptToFail = null;

    return jsonResponse(request, {
      clientSecret: session.client_secret,
      reused: false,
    });
  } catch (error) {
    const code = safeErrorCode(error);
    const stripe = safeStripeErrorDetails(error);
    const diagnosticCode = safeStripeErrorFingerprint(error, stage);
    const status = error instanceof BillingHttpError ? error.status : 500;

    if (attemptToFail) {
      const supabase = createServiceClient();
      await supabase
        .from("billing_checkout_attempts")
        .update({ status: "failed", error_code: diagnosticCode })
        .eq("request_id", attemptToFail.requestId)
        .eq("user_id", attemptToFail.userId);
    }

    console.error("[stripe-create-checkout]", { code, diagnosticCode, stage, stripe });
    return jsonResponse(request, { error: code }, status);
  }
});
