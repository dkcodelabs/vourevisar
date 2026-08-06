import { User } from '@supabase/supabase-js';

export const EMAIL_NOT_CONFIRMED_ERROR = 'Email not confirmed';
export const EMAIL_NOT_CONFIRMED_MESSAGE = 'Email não confirmado. Verifique sua caixa de entrada.';

const EMAIL_AUTH_PROVIDERS = new Set(['email', 'password']);

type AuthMethodUser = Pick<User, 'app_metadata'> & {
  email?: string;
  identities?: Array<{ provider?: string }> | null;
};

export type AuthMethodKind = 'email' | 'google' | 'hybrid' | 'unknown';

export const getAuthProviderNames = (user: AuthMethodUser): string[] => {
  const provider = user.app_metadata?.provider;
  const providers = user.app_metadata?.providers;
  const identityProviders = user.identities?.map((identity) => identity.provider) ?? [];

  return [...new Set([provider, ...(Array.isArray(providers) ? providers : []), ...identityProviders]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.toLowerCase()))];
};

export const hasPasswordAuthMethod = (user: AuthMethodUser): boolean => {
  const providerNames = getAuthProviderNames(user);

  if (providerNames.some((provider) => EMAIL_AUTH_PROVIDERS.has(provider))) {
    return true;
  }

  // Older email/password users may not have provider metadata populated.
  if (providerNames.length === 0) {
    return Boolean(user.email);
  }

  return false;
};

export const hasGoogleAuthMethod = (user: AuthMethodUser): boolean =>
  getAuthProviderNames(user).includes('google');

export const getAuthMethodKind = (
  user: AuthMethodUser,
  hasPasswordCredential?: boolean,
): AuthMethodKind => {
  const hasPassword = hasPasswordCredential ?? hasPasswordAuthMethod(user);
  const hasGoogle = hasGoogleAuthMethod(user);

  if (hasPassword && hasGoogle) return 'hybrid';
  if (hasPassword) return 'email';
  if (hasGoogle) return 'google';
  return 'unknown';
};

export const isEmailPasswordUser = hasPasswordAuthMethod;

export const hasConfirmedEmail = (user: Pick<User, 'email_confirmed_at' | 'confirmed_at'>): boolean => {
  return Boolean(user.email_confirmed_at || user.confirmed_at);
};

export const isEmailConfirmationPending = (
  user: Pick<User, 'app_metadata' | 'email' | 'email_confirmed_at' | 'confirmed_at'>
): boolean => {
  return isEmailPasswordUser(user) && !hasConfirmedEmail(user);
};
