const billingPortalReturnSuffix = ':billing-portal-return';

const isSerializedSupabaseSession = (value: string) => {
  try {
    const session = JSON.parse(value) as { access_token?: unknown; refresh_token?: unknown };
    return typeof session.access_token === 'string' && typeof session.refresh_token === 'string';
  } catch {
    return false;
  }
};

export const getSupabaseAuthStorageKey = (supabaseUrl: string) => {
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  return `sb-${projectRef}-auth-token`;
};

export const getBillingPortalReturnStorageKey = (authStorageKey: string) =>
  `${authStorageKey}${billingPortalReturnSuffix}`;

/**
 * Stripe's Customer Portal replaces the current document. Some browser privacy
 * modes can fail to restore localStorage after that cross-site navigation even
 * though the Supabase session itself was never revoked. Keep an exact copy only
 * in this tab's sessionStorage, then consume it on the return document.
 */
export const preserveSessionForBillingPortalReturn = (authStorageKey: string) => {
  if (typeof window === 'undefined') return;

  try {
    const serializedSession = window.localStorage.getItem(authStorageKey);
    if (!serializedSession || !isSerializedSupabaseSession(serializedSession)) return;

    window.sessionStorage.setItem(
      getBillingPortalReturnStorageKey(authStorageKey),
      serializedSession,
    );
  } catch {
    // Storage can be disabled by the browser. Do not prevent the customer from
    // opening Stripe in that case; the ordinary Supabase session still remains
    // the primary mechanism.
  }
};

/**
 * Runs before the Supabase client is created. A normal localStorage session
 * always wins; the one-tab backup is removed in every branch so refresh tokens
 * are never retained after the Portal return is resolved.
 */
export const restoreSessionAfterBillingPortalReturn = (authStorageKey: string) => {
  if (typeof window === 'undefined') return false;

  try {
    const recoveryKey = getBillingPortalReturnStorageKey(authStorageKey);
    const serializedSession = window.sessionStorage.getItem(recoveryKey);
    window.sessionStorage.removeItem(recoveryKey);

    if (!serializedSession || !isSerializedSupabaseSession(serializedSession)) return false;
    if (window.localStorage.getItem(authStorageKey)) return false;

    window.localStorage.setItem(authStorageKey, serializedSession);
    return true;
  } catch {
    return false;
  }
};
