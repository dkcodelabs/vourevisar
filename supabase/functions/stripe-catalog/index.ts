import {
  BillingHttpError,
  createStripeClient,
  getPlanPriceId,
  handleOptions,
  jsonResponse,
  safeErrorCode,
  type BillingPlanCode,
} from "../_shared/stripeBilling.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return handleOptions(request);
  if (request.method !== "POST") return jsonResponse(request, { error: "method_not_allowed" }, 405);

  try {
    const stripe = createStripeClient();

    const planCodes: BillingPlanCode[] = ["monthly", "annual"];
    const plans = await Promise.all(
      planCodes.map(async (code) => {
        const price = await stripe.prices.retrieve(getPlanPriceId(code));

        if (!price.active || !price.recurring || price.unit_amount === null) {
          throw new BillingHttpError(503, `stripe_price_unavailable:${code}`);
        }

        const expectedInterval = code === "monthly" ? "month" : "year";
        if (price.recurring.interval !== expectedInterval) {
          throw new BillingHttpError(503, `stripe_price_interval_mismatch:${code}`);
        }

        return {
          code,
          name: code === "monthly" ? "Mensal" : "Anual",
          amountCents: price.unit_amount,
          currency: price.currency,
          interval: price.recurring.interval,
          metadata: price.metadata,
        };
      }),
    );

    return jsonResponse(request, { plans });
  } catch (error) {
    const code = safeErrorCode(error);
    const status = error instanceof BillingHttpError ? error.status : 500;
    console.error("[stripe-catalog]", { code });
    return jsonResponse(request, { error: code }, status);
  }
});
