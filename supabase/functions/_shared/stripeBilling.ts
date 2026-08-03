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

export const createStripeClient = () =>
  new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    httpClient: Stripe.createFetchHttpClient(),
  });

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
