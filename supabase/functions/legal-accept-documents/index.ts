import {
  BILLING_PRIVACY_VERSION,
  BILLING_TERMS_VERSION,
  isBillingContractAcceptanceEnabled,
} from "../_shared/billingContract.ts";
import {
  BillingHttpError,
  createServiceClient,
  handleOptions,
  jsonResponse,
  requireAuthenticatedUser,
  safeErrorCode,
} from "../_shared/stripeBilling.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return handleOptions(request);
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { "Allow": "POST" } });
  }

  try {
    if (!isBillingContractAcceptanceEnabled()) {
      throw new BillingHttpError(503, "legal_acceptance_not_enabled");
    }

    const body = await request.json().catch(() => null) as {
      termsVersion?: unknown;
      privacyVersion?: unknown;
    } | null;
    if (
      body?.termsVersion !== BILLING_TERMS_VERSION ||
      body?.privacyVersion !== BILLING_PRIVACY_VERSION
    ) {
      throw new BillingHttpError(409, "legal_version_outdated");
    }

    const supabase = createServiceClient();
    const user = await requireAuthenticatedUser(request, supabase);
    const { data, error } = await supabase
      .from("legal_document_acceptances")
      .upsert({
        user_id: user.id,
        acceptance_context: "signup_trial",
        terms_version: BILLING_TERMS_VERSION,
        privacy_version: BILLING_PRIVACY_VERSION,
      }, {
        onConflict: "user_id,acceptance_context,terms_version,privacy_version",
        ignoreDuplicates: true,
      })
      .select("id")
      .maybeSingle();
    if (error) throw error;

    return jsonResponse(request, { accepted: true, reused: !data });
  } catch (error) {
    const code = safeErrorCode(error);
    const status = error instanceof BillingHttpError ? error.status : 500;
    console.error("[legal-accept-documents]", { code });
    return jsonResponse(request, { error: code }, status);
  }
});
