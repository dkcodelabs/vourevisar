import {
  BillingHttpError,
  createServiceClient,
  createStripeClient,
  getAppUrl,
  handleOptions,
  jsonResponse,
  requireAuthenticatedUser,
  safeErrorCode,
} from "../_shared/stripeBilling.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return handleOptions(request);
  if (request.method !== "POST") return jsonResponse(request, { error: "method_not_allowed" }, 405);

  try {
    const supabase = createServiceClient();
    const user = await requireAuthenticatedUser(request, supabase);
    const { data: customer, error } = await supabase
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    if (!customer?.stripe_customer_id) {
      throw new BillingHttpError(404, "stripe_customer_not_found");
    }

    const stripe = createStripeClient();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: `${getAppUrl()}/conta/assinatura`,
    });

    return jsonResponse(request, { url: portalSession.url });
  } catch (error) {
    const code = safeErrorCode(error);
    const status = error instanceof BillingHttpError ? error.status : 500;
    console.error("[stripe-create-portal]", { code });
    return jsonResponse(request, { error: code }, status);
  }
});
