import {
  BillingHttpError,
  createServiceClient,
  createStripeClient,
  getAppUrl,
  getPlanPriceId,
  handleOptions,
  isBillingPlanCode,
  isUuid,
  jsonResponse,
  requireAuthenticatedUser,
  safeErrorCode,
  safeStripeErrorDetails,
  safeStripeErrorFingerprint,
} from "../_shared/stripeBilling.ts";

const CHECKOUT_IDEMPOTENCY_VERSION = "elements-v1";

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

    stage = "subscription_guard";
    const { data: paidSubscriptions, error: paidSubscriptionError } = await supabase
      .from("billing_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .gt("current_period_end", new Date().toISOString())
      .limit(1);

    if (paidSubscriptionError) throw paidSubscriptionError;
    if (paidSubscriptions?.length) {
      throw new BillingHttpError(409, "subscription_already_active");
    }

    const stripe = createStripeClient();
    const priceId = getPlanPriceId(plan);

    stage = "attempt_lookup";
    const { data: openAttempt } = await supabase
      .from("billing_checkout_attempts")
      .select("stripe_checkout_session_id")
      .eq("user_id", user.id)
      .eq("plan_code", plan)
      .in("status", ["creating", "open"])
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openAttempt?.stripe_checkout_session_id) {
      const existingSession = await stripe.checkout.sessions.retrieve(
        openAttempt.stripe_checkout_session_id,
      );
      if (existingSession.status === "open" && existingSession.client_secret) {
        return jsonResponse(request, {
          clientSecret: existingSession.client_secret,
          reused: true,
        });
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
        const repeatedSession = await stripe.checkout.sessions.retrieve(
          repeatedAttempt.stripe_checkout_session_id,
        );
        if (repeatedSession.client_secret) {
          if (repeatedSession.status === "open") {
            return jsonResponse(request, {
              clientSecret: repeatedSession.client_secret,
              reused: true,
            });
          }
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

    let customerId: string;
    stage = "customer_lookup";
    const { data: customerRecord, error: customerLookupError } = await supabase
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (customerLookupError) throw customerLookupError;

    if (customerRecord?.stripe_customer_id) {
      customerId = customerRecord.stripe_customer_id;
    } else {
      stage = "customer_create";
      const customer = await stripe.customers.create(
        {
          email: user.email,
          name: typeof user.user_metadata?.name === "string"
            ? user.user_metadata.name
            : typeof user.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name
              : undefined,
          metadata: { supabase_user_id: user.id },
        },
        { idempotencyKey: `billing-customer:${user.id}` },
      );
      customerId = customer.id;

      const { error: customerInsertError } = await supabase
        .from("billing_customers")
        .upsert(
          {
            user_id: user.id,
            stripe_customer_id: customer.id,
            livemode: customer.livemode,
          },
          { onConflict: "user_id" },
        );
      if (customerInsertError) throw customerInsertError;
    }

    stage = "checkout_session_create";
    const appUrl = getAppUrl();
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        ui_mode: "elements",
        customer: customerId,
        client_reference_id: user.id,
        payment_method_types: ["card"],
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
          `billing-checkout:${CHECKOUT_IDEMPOTENCY_VERSION}:${user.id}:${requestId}`,
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
