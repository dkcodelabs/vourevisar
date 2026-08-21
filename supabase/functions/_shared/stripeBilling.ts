import Stripe from "npm:stripe@22.4.0";
import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2.75.1";

export type BillingPlanCode = "monthly" | "annual";

const DEFAULT_LOCAL_ORIGINS = new Set([
  "http://127.0.0.1:8081",
  "http://localhost:8081",
]);

export const jsonResponse = (
  request: Request,
  body: Record<string, unknown>,
  status = 200,
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

export const corsHeaders = (request: Request) => {
  const requestOrigin = request.headers.get("origin");
  const appUrl = Deno.env.get("APP_URL")?.replace(/\/$/, "");
  const allowedOrigins = new Set(DEFAULT_LOCAL_ORIGINS);
  if (appUrl) allowedOrigins.add(appUrl);

  const allowedOrigin = requestOrigin && allowedOrigins.has(requestOrigin)
    ? requestOrigin
    : appUrl ?? "http://127.0.0.1:8081";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};

export const handleOptions = (request: Request) =>
  new Response(null, { status: 204, headers: corsHeaders(request) });

export const requireEnv = (name: string) => {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`missing_environment:${name}`);
  return value;
};

export const getStripeLivemode = () => {
  const value = requireEnv("STRIPE_LIVEMODE").toLowerCase();
  if (value !== "true" && value !== "false") {
    throw new Error("invalid_environment:STRIPE_LIVEMODE");
  }
  return value === "true";
};

const getStripeKeyLivemode = (key: string) => {
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) return true;
  if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) return false;
  return null;
};

export const createStripeClient = () => {
  const key = requireEnv("STRIPE_SECRET_KEY");
  const configuredLivemode = getStripeLivemode();
  const keyLivemode = getStripeKeyLivemode(key);
  if (keyLivemode !== null && keyLivemode !== configuredLivemode) {
    throw new Error("stripe_key_mode_mismatch");
  }

  return new Stripe(key, {
    httpClient: Stripe.createFetchHttpClient(),
  });
};

type BillingProfile = {
  email: string | null;
  name: string | null;
  phone: string | null;
};

const firstNonEmpty = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
};

const getBillingProfile = async (
  supabase: SupabaseClient,
  user: User,
): Promise<BillingProfile> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("name,email,phone")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  return {
    email: firstNonEmpty(data?.email, user.email),
    name: firstNonEmpty(
      data?.name,
      user.user_metadata?.name,
      user.user_metadata?.full_name,
    ),
    // Some older accounts kept the phone in auth metadata instead of profiles.
    phone: firstNonEmpty(data?.phone, user.user_metadata?.phone),
  };
};

/**
 * Reconciles non-empty billing details from the Supabase account with the
 * current Stripe Customer. Empty local fields never erase a Stripe value.
 * A country is only copied when Stripe itself supplied it from a payment
 * method billing address; the application must not guess a country.
 */
export const syncStripeCustomerDetails = async (
  supabase: SupabaseClient,
  stripe: Stripe,
  user: User,
  customerId: string,
  paymentMethodId?: string | null,
) => {
  const customer = await stripe.customers.retrieve(customerId);
  if ("deleted" in customer && customer.deleted) {
    throw new Error("stripe_customer_deleted");
  }

  const profile = await getBillingProfile(supabase, user);
  let paymentMethod: Stripe.PaymentMethod | null = null;
  if (paymentMethodId) {
    paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
  }

  const paymentDetails = paymentMethod?.billing_details;
  const updates: Stripe.CustomerUpdateParams = {
    metadata: { supabase_user_id: user.id },
  };
  const email = profile.email ?? firstNonEmpty(customer.email);
  const name = profile.name ?? firstNonEmpty(customer.name);
  const phone = profile.phone ?? firstNonEmpty(paymentDetails?.phone, customer.phone);

  if (email && email !== customer.email) updates.email = email;
  if (name && name !== customer.name) updates.name = name;
  if (phone && phone !== customer.phone) updates.phone = phone;

  const country = firstNonEmpty(paymentDetails?.address?.country);
  if (country && country !== customer.address?.country) {
    updates.address = { ...(customer.address ?? {}), country };
  }

  const hasMetadataUpdate = customer.metadata.supabase_user_id !== user.id;
  if (
    updates.email === undefined &&
    updates.name === undefined &&
    updates.phone === undefined &&
    updates.address === undefined &&
    !hasMetadataUpdate
  ) {
    return customer;
  }

  return stripe.customers.update(customerId, updates);
};

/**
 * Returns a customer that belongs to the currently configured Stripe account.
 *
 * Customer IDs are account-scoped. After changing Stripe accounts, a locally
 * stored ID can be valid in the old account but missing in the new one. In
 * that case create a fresh customer and atomically replace the local mapping.
 */
export const resolveBillingCustomer = async (
  supabase: SupabaseClient,
  stripe: Stripe,
  user: User,
  livemode: boolean,
  stripeCustomerId?: string | null,
) => {
  if (stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(stripeCustomerId);
      if (!existing.deleted) {
        if (existing.livemode !== livemode) {
          throw new Error("stripe_customer_mode_mismatch");
        }
        await syncStripeCustomerDetails(supabase, stripe, user, existing.id);
        return existing.id;
      }
    } catch (error) {
      if (safeStripeErrorDetails(error)?.code !== "resource_missing") throw error;
    }
  }

  const profile = await getBillingProfile(supabase, user);
  const customer = await stripe.customers.create(
    {
      email: profile.email ?? undefined,
      name: profile.name ?? undefined,
      phone: profile.phone ?? undefined,
      metadata: { supabase_user_id: user.id },
    },
    {
      idempotencyKey:
        `billing-customer:${livemode ? "live" : "test"}:${user.id}:${stripeCustomerId ?? "initial"}`,
    },
  );

  if (customer.livemode !== livemode) {
    throw new Error("stripe_customer_mode_mismatch");
  }

  const { error } = await supabase
    .from("billing_customers")
    .upsert(
      {
        user_id: user.id,
        stripe_customer_id: customer.id,
        livemode,
      },
      { onConflict: "user_id,livemode" },
    );
  if (error) throw error;

  return customer.id;
};

export const createServiceClient = (): SupabaseClient =>
  createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

export const requireAuthenticatedUser = async (
  request: Request,
  supabase: SupabaseClient,
): Promise<User> => {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new BillingHttpError(401, "authentication_required");
  }

  const token = authorization.slice("Bearer ".length);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new BillingHttpError(401, "invalid_session");
  }

  return data.user;
};

export const getAppUrl = () => requireEnv("APP_URL").replace(/\/$/, "");

export const getPlanPriceId = (plan: BillingPlanCode) =>
  requireEnv(plan === "monthly" ? "STRIPE_MONTHLY_PRICE_ID" : "STRIPE_ANNUAL_PRICE_ID");

export const getPlanFromPriceId = (priceId: string): BillingPlanCode | null => {
  const monthly = Deno.env.get("STRIPE_MONTHLY_PRICE_ID")?.trim();
  const annual = Deno.env.get("STRIPE_ANNUAL_PRICE_ID")?.trim();
  if (priceId === monthly) return "monthly";
  if (priceId === annual) return "annual";
  return null;
};

export const isBillingPlanCode = (value: unknown): value is BillingPlanCode =>
  value === "monthly" || value === "annual";

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const fromUnixSeconds = (value?: number | null) =>
  typeof value === "number" ? new Date(value * 1000).toISOString() : null;

export const safeErrorCode = (error: unknown) => {
  if (error instanceof BillingHttpError) return error.code;
  if (error instanceof Stripe.errors.StripeError) return `stripe_${error.type}`;
  if (error instanceof Error && error.message.startsWith("missing_environment:")) {
    return "billing_not_configured";
  }
  return "billing_internal_error";
};

export const safeStripeErrorDetails = (error: unknown) => {
  if (!(error instanceof Stripe.errors.StripeError)) return null;

  return {
    type: error.type,
    code: error.code ?? null,
    param: error.param ?? null,
    message: error.message.slice(0, 500),
    requestId: error.requestId ?? null,
  };
};

const safeDiagnosticToken = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "unknown";

export const safeStripeErrorFingerprint = (error: unknown, stage: string) => {
  const stripe = safeStripeErrorDetails(error);
  if (!stripe) return safeErrorCode(error);

  return [
    safeDiagnosticToken(stage),
    "stripe",
    safeDiagnosticToken(stripe.code ?? stripe.type),
    safeDiagnosticToken(stripe.param ?? "none"),
  ].join(":").slice(0, 250);
};

export class BillingHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
  }
}
