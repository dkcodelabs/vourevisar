const clean = (value: string | undefined) => value?.trim() || null;

export const legalProvider = {
  name: clean(import.meta.env.VITE_LEGAL_PROVIDER_NAME),
  registration: clean(import.meta.env.VITE_LEGAL_PROVIDER_REGISTRATION),
  address: clean(import.meta.env.VITE_LEGAL_PROVIDER_ADDRESS),
  email: clean(import.meta.env.VITE_LEGAL_CONTACT_EMAIL),
} as const;

export const isLegalProviderConfigured = Object.values(legalProvider).every(Boolean);
