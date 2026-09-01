const configuredSupportEmail = import.meta.env.VITE_SUPPORT_EMAIL?.trim();

export const SUPPORT_EMAIL = configuredSupportEmail || 'vourevisar@gmail.com';

export const getSupportEmailUrl = (subject: string) =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
