export const BILLING_TERMS_VERSION = '2026-08-21.1-draft';
export const BILLING_PRIVACY_VERSION = '2026-08-21.1-draft';
export const BILLING_REFUND_POLICY_VERSION = '2026-08-21.1-draft';

export const isBillingContractAcceptanceEnabled = () =>
  import.meta.env.VITE_BILLING_CONTRACT_ACCEPTANCE_ENABLED?.trim().toLowerCase() === 'true';

export const billingContractVersions = {
  termsVersion: BILLING_TERMS_VERSION,
  privacyVersion: BILLING_PRIVACY_VERSION,
  refundPolicyVersion: BILLING_REFUND_POLICY_VERSION,
} as const;

export const billingLegalLinks = {
  terms: '/termos',
  privacy: '/privacidade',
  refunds: '/cancelamento-e-reembolso',
  contact: '/contato',
} as const;
