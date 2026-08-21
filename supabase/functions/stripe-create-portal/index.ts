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
      .select("stripe_customer_id")
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
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getAppUrl()}/conta/assinatura`,
    });

    return jsonResponse(request, { url: portalSession.url });
  } catch (error) {
    const code = safeErrorCode(error);
    console.error("[stripe-create-portal]", { code });
    return jsonResponse(request, { error: code }, 500);
  }
});
