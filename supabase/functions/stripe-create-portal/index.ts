import {
  createServiceClient,
  createStripeClient,
  getAppUrl,
  getStripeLivemode,
  handleOptions,
  jsonResponse,
  requireAuthenticatedUser,
  resolveBillingCustomer,
  safeErrorCode,
  safeStripeErrorDetails,
} from "../_shared/stripeBilling.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return handleOptions(request);
  if (request.method !== "POST") return jsonResponse(request, { error: "method_not_allowed" }, 405);

  try {
    const supabase = createServiceClient();
    const user = await requireAuthenticatedUser(request, supabase);
    const livemode = getStripeLivemode();
    const { data: customer, error } = await supabase
      .from("billing_customers")
      .select("id,stripe_customer_id,updated_at")
      .eq("user_id", user.id)
      .eq("livemode", livemode)
      .maybeSingle();

    if (error) throw error;
    const stripe = createStripeClient();
    const customerId = await resolveBillingCustomer(
      supabase,
      stripe,
      user,
      livemode,
      customer?.stripe_customer_id,
    );

    // During the statutory withdrawal window, cancellation and refund must
    // happen through the first-party flow so they stay coupled, idempotent and
    // auditable. The application normally keeps card management out of this
    // state, but a payment-recovery screen can still use this official Stripe
    // deep link without exposing the broader Portal cancellation action.
    const { data: currentSubscription, error: currentSubscriptionError } = await supabase
      .from("billing_subscriptions")
      .select("id,status")
      .eq("user_id", user.id)
      // billing_subscriptions does not carry a mode column. The immutable
      // customer mapping is the mode boundary: it prevents a Test subscription
      // from changing the Live Customer Portal behavior and vice-versa.
      .eq("billing_customer_id", customer?.id ?? "00000000-0000-0000-0000-000000000000")
      .gte("updated_at", customer?.updated_at ?? new Date().toISOString())
      .in("status", ["active", "past_due"])
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (currentSubscriptionError) throw currentSubscriptionError;

    let withdrawalWindowOpen = false;
    if (currentSubscription) {
      const { data: acceptance, error: acceptanceError } = await supabase
        .from("billing_contract_acceptances")
        .select("withdrawal_deadline")
        .eq("billing_subscription_id", currentSubscription.id)
        .eq("livemode", livemode)
        .maybeSingle();
      if (acceptanceError) throw acceptanceError;
      withdrawalWindowOpen = Boolean(
        acceptance?.withdrawal_deadline &&
        new Date(acceptance.withdrawal_deadline).getTime() >= Date.now(),
      );
    }

    const returnUrl = `${getAppUrl()}/conta/assinatura`;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
      ...(withdrawalWindowOpen
        ? {
          flow_data: {
            type: "payment_method_update" as const,
          },
        }
        : {}),
    });

    return jsonResponse(request, { url: portalSession.url });
  } catch (error) {
    const code = safeErrorCode(error);
    console.error("[stripe-create-portal]", {
      code,
      stripe: safeStripeErrorDetails(error),
    });
    return jsonResponse(request, { error: code }, 500);
  }
});
