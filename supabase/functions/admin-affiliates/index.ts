import Stripe from "npm:stripe@22.4.0";
import {
  BillingHttpError,
  createServiceClient,
  createStripeClient,
  getStripeLivemode,
  handleOptions,
  isUuid,
  jsonResponse,
  requireAuthenticatedUser,
  safeErrorCode,
} from "../_shared/stripeBilling.ts";

type ServiceClient = ReturnType<typeof createServiceClient>;
type AdminAffiliateAction = "list" | "create" | "set_active" | "record_payout";

const AFFILIATE_DISCOUNT_PERCENT = 20;
const AFFILIATE_COMMISSION_PERCENT = 30;
const AFFILIATE_CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,31}$/;

const requireOwner = async (userId: string, supabase: ServiceClient) => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new BillingHttpError(403, "owner_access_required");
};

const normalizeCode = (value: unknown) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

const sanitizeReference = (value: unknown) =>
  typeof value === "string" ? value.trim().slice(0, 160) : "";

const listAffiliateLedger = async (supabase: ServiceClient, livemode: boolean) => {
  const [affiliatesResult, conversionsResult, payoutsResult] = await Promise.all([
    supabase
      .from("billing_affiliates")
      .select("id,name,code,discount_percent,commission_percent,active,created_at")
      .eq("livemode", livemode)
      .order("created_at", { ascending: false }),
    supabase
      .from("billing_affiliate_conversions")
      .select("id,affiliate_id,user_id,plan_code,gross_amount_cents,discount_amount_cents,paid_amount_cents,commission_percent,commission_amount_cents,currency,status,paid_at,eligible_at,payout_id,created_at")
      .order("paid_at", { ascending: false })
      .limit(1000),
    supabase
      .from("billing_affiliate_payouts")
      .select("id,affiliate_id,period_start,period_end,amount_cents,conversion_count,payment_reference,paid_at")
      .eq("livemode", livemode)
      .order("paid_at", { ascending: false })
      .limit(250),
  ]);

  if (affiliatesResult.error) throw affiliatesResult.error;
  if (conversionsResult.error) throw conversionsResult.error;
  if (payoutsResult.error) throw payoutsResult.error;

  const affiliateIds = new Set((affiliatesResult.data ?? []).map((row) => row.id));
  const conversions = (conversionsResult.data ?? []).filter((row) => affiliateIds.has(row.affiliate_id));
  const userIds = [...new Set(conversions.map((row) => row.user_id).filter(Boolean))] as string[];
  const { data: profiles, error: profilesError } = userIds.length
    ? await supabase.from("profiles").select("id,name,email").in("id", userIds)
    : { data: [], error: null };
  if (profilesError) throw profilesError;

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const now = Date.now();

  return {
    livemode,
    policy: {
      discountPercent: AFFILIATE_DISCOUNT_PERCENT,
      commissionPercent: AFFILIATE_COMMISSION_PERCENT,
      commissionScope: "first_subscription_invoice",
    },
    affiliates: affiliatesResult.data ?? [],
    conversions: conversions.map((row) => {
      const profile = row.user_id ? profileById.get(row.user_id) : null;
      return {
        ...row,
        user_name: profile?.name ?? null,
        user_email: profile?.email ?? null,
        payout_status: row.status === "pending" && new Date(row.eligible_at).getTime() <= now
          ? "eligible"
          : row.status,
      };
    }),
    payouts: payoutsResult.data ?? [],
  };
};

const createAffiliate = async (
  supabase: ServiceClient,
  stripe: Stripe,
  actorId: string,
  livemode: boolean,
  nameValue: unknown,
  codeValue: unknown,
  requestId: unknown,
) => {
  const name = typeof nameValue === "string" ? nameValue.trim() : "";
  const code = normalizeCode(codeValue);
  if (name.length < 2 || name.length > 120 || !AFFILIATE_CODE_PATTERN.test(code)) {
    throw new BillingHttpError(400, "invalid_affiliate_details");
  }
  if (!isUuid(requestId)) throw new BillingHttpError(400, "invalid_affiliate_request_id");

  const { data: existing, error: existingError } = await supabase
    .from("billing_affiliates")
    .select("id")
    .eq("code", code)
    .eq("livemode", livemode)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) throw new BillingHttpError(409, "affiliate_code_already_exists");

  let coupon: Stripe.Coupon | null = null;
  let promotionCode: Stripe.PromotionCode | null = null;
  try {
    coupon = await stripe.coupons.create(
      {
        duration: "once",
        percent_off: AFFILIATE_DISCOUNT_PERCENT,
        name: `${code} · ${AFFILIATE_DISCOUNT_PERCENT}% na primeira cobrança`,
        metadata: {
          vourevisar_affiliate_code: code,
          vourevisar_affiliate_name: name,
        },
      },
      { idempotencyKey: `affiliate-coupon:${livemode ? "live" : "test"}:${requestId}` },
    );

    promotionCode = await stripe.promotionCodes.create(
      {
        code,
        restrictions: {
          first_time_transaction: true,
        },
        promotion: {
          type: "coupon",
          coupon: coupon.id,
        },
        metadata: {
          vourevisar_affiliate_code: code,
          vourevisar_affiliate_name: name,
        },
      },
      { idempotencyKey: `affiliate-code:${livemode ? "live" : "test"}:${requestId}` },
    );

    const { error } = await supabase.from("billing_affiliates").insert({
      name,
      code,
      stripe_coupon_id: coupon.id,
      stripe_promotion_code_id: promotionCode.id,
      discount_percent: AFFILIATE_DISCOUNT_PERCENT,
      commission_percent: AFFILIATE_COMMISSION_PERCENT,
      livemode,
      active: true,
      created_by: actorId,
    });
    if (error) throw error;
  } catch (error) {
    if (promotionCode?.id) {
      await stripe.promotionCodes.update(promotionCode.id, { active: false }).catch(() => null);
    }
    if (coupon?.id) await stripe.coupons.del(coupon.id).catch(() => null);
    throw error;
  }
};

const setAffiliateActive = async (
  supabase: ServiceClient,
  stripe: Stripe,
  livemode: boolean,
  affiliateId: unknown,
  active: unknown,
) => {
  if (!isUuid(affiliateId) || typeof active !== "boolean") {
    throw new BillingHttpError(400, "invalid_affiliate_status_request");
  }

  const { data: affiliate, error } = await supabase
    .from("billing_affiliates")
    .select("stripe_promotion_code_id")
    .eq("id", affiliateId)
    .eq("livemode", livemode)
    .maybeSingle();
  if (error) throw error;
  if (!affiliate) throw new BillingHttpError(404, "affiliate_not_found");

  await stripe.promotionCodes.update(affiliate.stripe_promotion_code_id, { active });
  const { error: updateError } = await supabase
    .from("billing_affiliates")
    .update({ active })
    .eq("id", affiliateId)
    .eq("livemode", livemode);
  if (updateError) throw updateError;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return handleOptions(request);
  if (request.method !== "POST") return jsonResponse(request, { error: "method_not_allowed" }, 405);

  try {
    const supabase = createServiceClient();
    const actor = await requireAuthenticatedUser(request, supabase);
    await requireOwner(actor.id, supabase);
    const livemode = getStripeLivemode();
    const body = await request.json().catch(() => ({})) as {
      action?: AdminAffiliateAction;
      name?: unknown;
      code?: unknown;
      requestId?: unknown;
      affiliateId?: unknown;
      active?: unknown;
      periodStart?: unknown;
      periodEnd?: unknown;
      paymentReference?: unknown;
    };
    const action = body.action ?? "list";

    if (action === "list") {
      return jsonResponse(request, await listAffiliateLedger(supabase, livemode));
    }

    if (action === "create") {
      await createAffiliate(
        supabase,
        createStripeClient(),
        actor.id,
        livemode,
        body.name,
        body.code,
        body.requestId,
      );
      return jsonResponse(request, await listAffiliateLedger(supabase, livemode));
    }

    if (action === "set_active") {
      await setAffiliateActive(
        supabase,
        createStripeClient(),
        livemode,
        body.affiliateId,
        body.active,
      );
      return jsonResponse(request, await listAffiliateLedger(supabase, livemode));
    }

    if (action === "record_payout") {
      if (
        !isUuid(body.affiliateId)
        || typeof body.periodStart !== "string"
        || typeof body.periodEnd !== "string"
        || !/^\d{4}-\d{2}-\d{2}$/.test(body.periodStart)
        || !/^\d{4}-\d{2}-\d{2}$/.test(body.periodEnd)
      ) {
        throw new BillingHttpError(400, "invalid_affiliate_payout_request");
      }

      const { error } = await supabase.rpc("record_billing_affiliate_payout", {
        p_affiliate_id: body.affiliateId,
        p_livemode: livemode,
        p_period_start: body.periodStart,
        p_period_end: body.periodEnd,
        p_payment_reference: sanitizeReference(body.paymentReference),
        p_created_by: actor.id,
      });
      if (error) throw error;
      return jsonResponse(request, await listAffiliateLedger(supabase, livemode));
    }

    throw new BillingHttpError(400, "invalid_admin_affiliate_action");
  } catch (error) {
    const code = safeErrorCode(error);
    const status = error instanceof BillingHttpError ? error.status : 500;
    console.error("[admin-affiliates]", { code });
    return jsonResponse(request, { error: code }, status);
  }
});
