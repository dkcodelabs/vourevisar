export const BILLING_TERMS_VERSION = "2026-08-21.1-draft";
export const BILLING_PRIVACY_VERSION = "2026-08-21.1-draft";
export const BILLING_REFUND_POLICY_VERSION = "2026-08-21.1-draft";

// These canonical summaries are deliberately server-owned. The acceptance
// endpoint hashes exactly what the application promises at checkout instead
// of trusting text or hashes supplied by the browser.
const BILLING_TERMS_CANONICAL = [
  "vouRevisar recurring subscription",
  "explicit monthly or annual plan selection",
  "automatic renewal until cancellation",
  "seven-day free access is separate and creates no Stripe subscription",
  "customer can cancel future renewal without deleting study data",
].join("\n");

const BILLING_REFUND_POLICY_CANONICAL = [
  "Brazilian online-contract withdrawal window",
  "full refund of the first paid subscription payment when eligible",
  "immediate paid-subscription cancellation after withdrawal request",
  "refund completion remains subject to provider and card-network status",
  "normal cancellation after the window stops renewal without automatic refund",
].join("\n");

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export const getBillingContractDocuments = async () => ({
  termsVersion: BILLING_TERMS_VERSION,
  privacyVersion: BILLING_PRIVACY_VERSION,
  refundPolicyVersion: BILLING_REFUND_POLICY_VERSION,
  termsSha256: await sha256Hex(BILLING_TERMS_CANONICAL),
  refundPolicySha256: await sha256Hex(BILLING_REFUND_POLICY_CANONICAL),
});

export const isBillingContractAcceptanceEnabled = () =>
  Deno.env.get("BILLING_CONTRACT_ACCEPTANCE_ENABLED")?.trim().toLowerCase() === "true";

export const isBillingWithdrawalEnabled = () =>
  Deno.env.get("BILLING_WITHDRAWAL_ENABLED")?.trim().toLowerCase() === "true";

export const isBillingWithdrawalAdminEnabled = () =>
  Deno.env.get("BILLING_WITHDRAWAL_ADMIN_ENABLED")?.trim().toLowerCase() === "true";
