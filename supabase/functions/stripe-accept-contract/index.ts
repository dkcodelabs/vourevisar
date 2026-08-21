import Stripe from "npm:stripe@22.4.0";
import {
  BillingHttpError,
  createServiceClient,
  createStripeClient,
  getPlanPriceId,
  getStripeLivemode,
  handleOptions,
  isUuid,
  jsonResponse,
  requireAuthenticatedUser,
  safeErrorCode,
} from "../_shared/stripeBilling.ts";
import {
  getBillingContractDocuments,
  isBillingContractAcceptanceEnabled,
} from "../_shared/billingContract.ts";

const getExpandableId = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") {
    return value.id;
  }
  return null;
};

const getSessionPrice = async (stripe: Stripe, session: Stripe.Checkout.Session) => {
  const expandedPrice = session.line_items?.data[0]?.price;
  if (expandedPrice && typeof expandedPrice !== "string") return expandedPrice;

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
  const price = lineItems.data[0]?.price;
  if (!price) throw new BillingHttpError(409, "checkout_price_missing");
  return typeof price === "string" ? stripe.prices.retrieve(price) : price;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return handleOptions(request);
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { "Allow": "POST" } });
  }

  try {
    if (!isBillingContractAcceptanceEnabled()) {
      throw new BillingHttpError(503, "contract_acceptance_not_enabled");
    }

    const body = await request.json().catch(() => null) as {
      requestId?: unknown;
      termsVersion?: unknown;
      privacyVersion?: unknown;
      refundPolicyVersion?: unknown;
    } | null;

    if (!body || !isUuid(body.requestId)) {
      throw new BillingHttpError(400, "invalid_contract_acceptance");
    }

    const documents = await getBillingContractDocuments();
    if (
      body.termsVersion !== documents.termsVersion ||
      body.privacyVersion !== documents.privacyVersion ||
      body.refundPolicyVersion !== documents.refundPolicyVersion
    ) {
      throw new BillingHttpError(409, "contract_version_outdated");
    }

    const supabase = createServiceClient();
    const user = await requireAuthenticatedUser(request, supabase);
    const livemode = getStripeLivemode();
    const { data: attempt, error: attemptError } = await supabase
      .from("billing_checkout_attempts")
      .select("id,user_id,plan_code,stripe_checkout_session_id,status,expires_at")
      .eq("request_id", body.requestId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (attemptError) throw attemptError;
    if (!attempt?.stripe_checkout_session_id) {
      throw new BillingHttpError(404, "checkout_attempt_not_found");
    }
    if (attempt.status !== "open") {
      throw new BillingHttpError(409, "checkout_not_open");
    }
    if (attempt.expires_at && new Date(attempt.expires_at).getTime() <= Date.now()) {
      throw new BillingHttpError(409, "checkout_expired");
    }

    const stripe = createStripeClient();
    const session = await stripe.checkout.sessions.retrieve(
      attempt.stripe_checkout_session_id,
      { expand: ["line_items.data.price"] },
    );
    const sessionMetadata = session.metadata ?? {};
    if (
      session.status !== "open" ||
      session.mode !== "subscription" ||
      session.livemode !== livemode ||
      session.client_reference_id !== user.id ||
      sessionMetadata.supabase_user_id !== user.id ||
      sessionMetadata.request_id !== body.requestId
    ) {
      throw new BillingHttpError(409, "checkout_contract_mismatch");
    }

    const price = await getSessionPrice(stripe, session);
    const expectedPriceId = getPlanPriceId(attempt.plan_code);
    const priceId = getExpandableId(price);
    const amountCents = price.unit_amount;
    const interval = price.recurring?.interval;
    if (
      priceId !== expectedPriceId ||
      amountCents === null ||
      amountCents <= 0 ||
      (interval !== "month" && interval !== "year")
    ) {
      throw new BillingHttpError(409, "checkout_price_mismatch");
    }

    const acceptanceRecord = {
      user_id: user.id,
      checkout_attempt_id: attempt.id,
      livemode,
      plan_code: attempt.plan_code,
      amount_cents: amountCents,
      currency: price.currency,
      billing_interval: interval,
      terms_version: documents.termsVersion,
      privacy_version: documents.privacyVersion,
      refund_policy_version: documents.refundPolicyVersion,
      terms_sha256: documents.termsSha256,
      refund_policy_sha256: documents.refundPolicySha256,
    };

    const { data: existing, error: existingError } = await supabase
      .from("billing_contract_acceptances")
      .select("id,terms_version,privacy_version,refund_policy_version")
      .eq("checkout_attempt_id", attempt.id)
      .maybeSingle();
    if (existingError) throw existingError;

    if (
      existing &&
      (
        existing.terms_version !== documents.termsVersion ||
        existing.privacy_version !== documents.privacyVersion ||
        existing.refund_policy_version !== documents.refundPolicyVersion
      )
    ) {
      throw new BillingHttpError(409, "contract_version_conflict");
    }

    let acceptanceId = existing?.id as string | undefined;
    if (!acceptanceId) {
      const { data: inserted, error: insertError } = await supabase
        .from("billing_contract_acceptances")
        .insert(acceptanceRecord)
        .select("id")
        .single();
      if (insertError) throw insertError;
      acceptanceId = inserted.id;
    }
    if (!acceptanceId) {
      throw new BillingHttpError(500, "contract_acceptance_missing");
    }

    await stripe.checkout.sessions.update(
      session.id,
      {
        metadata: {
          ...sessionMetadata,
          contract_acceptance_id: acceptanceId,
          terms_version: documents.termsVersion,
          refund_policy_version: documents.refundPolicyVersion,
        },
      },
      {
        idempotencyKey: `billing-contract:v1:${livemode ? "live" : "test"}:${session.id}`,
      },
    );

    return jsonResponse(request, { accepted: true, reused: Boolean(existing) });
  } catch (error) {
    const code = safeErrorCode(error);
    const status = error instanceof BillingHttpError ? error.status : 500;
    console.error("[stripe-accept-contract]", { code });
    return jsonResponse(request, { error: code }, status);
  }
});
