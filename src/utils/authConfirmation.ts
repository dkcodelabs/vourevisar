import { User } from '@supabase/supabase-js';

export const EMAIL_NOT_CONFIRMED_ERROR = 'Email not confirmed';
export const EMAIL_NOT_CONFIRMED_MESSAGE = 'Email não confirmado. Verifique sua caixa de entrada.';

export const isExpectedPasswordSignInError = (error: unknown): boolean => {
  return error instanceof Error && error.message.toLowerCase().includes('invalid login credentials');
};

const EMAIL_AUTH_PROVIDERS = new Set(['email', 'password']);

const getProviderNames = (user: Pick<User, 'app_metadata'>): string[] => {
  const provider = user.app_metadata?.provider;
  const providers = user.app_metadata?.providers;

  return [provider, ...(Array.isArray(providers) ? providers : [])]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.toLowerCase());
};

export const isEmailPasswordUser = (user: Pick<User, 'app_metadata' | 'email'>): boolean => {
  const providerNames = getProviderNames(user);

  if (providerNames.some((provider) => !EMAIL_AUTH_PROVIDERS.has(provider))) {
    return false;
  }

  return Boolean(user.email);
};

export const hasConfirmedEmail = (user: Pick<User, 'email_confirmed_at' | 'confirmed_at'>): boolean => {
  return Boolean(user.email_confirmed_at || user.confirmed_at);
};

export const isEmailConfirmationPending = (
  user: Pick<User, 'app_metadata' | 'email' | 'email_confirmed_at' | 'confirmed_at'>
): boolean => {
  return isEmailPasswordUser(user) && !hasConfirmedEmail(user);
};
