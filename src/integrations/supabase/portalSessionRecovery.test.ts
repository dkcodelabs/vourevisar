import { beforeEach, describe, expect, it } from 'vitest';
import {
  getBillingPortalReturnStorageKey,
  getSupabaseAuthStorageKey,
  preserveSessionForBillingPortalReturn,
  restoreSessionAfterBillingPortalReturn,
} from './portalSessionRecovery';

const authStorageKey = getSupabaseAuthStorageKey('https://example-ref.supabase.co');
const recoveryStorageKey = getBillingPortalReturnStorageKey(authStorageKey);
const serializedSession = JSON.stringify({
  access_token: 'access-token',
  refresh_token: 'refresh-token',
});

describe('billing Portal session recovery', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('uses the project ref in the same auth storage key used by the browser client', () => {
    expect(authStorageKey).toBe('sb-example-ref-auth-token');
  });

  it('restores a valid same-tab backup only when the normal session disappeared', () => {
    window.localStorage.setItem(authStorageKey, serializedSession);

    preserveSessionForBillingPortalReturn(authStorageKey);
    window.localStorage.removeItem(authStorageKey);

    expect(restoreSessionAfterBillingPortalReturn(authStorageKey)).toBe(true);
    expect(window.localStorage.getItem(authStorageKey)).toBe(serializedSession);
    expect(window.sessionStorage.getItem(recoveryStorageKey)).toBeNull();
  });

  it('keeps the normal local session authoritative and consumes the backup', () => {
    window.localStorage.setItem(authStorageKey, serializedSession);
    window.sessionStorage.setItem(recoveryStorageKey, serializedSession);

    expect(restoreSessionAfterBillingPortalReturn(authStorageKey)).toBe(false);
    expect(window.localStorage.getItem(authStorageKey)).toBe(serializedSession);
    expect(window.sessionStorage.getItem(recoveryStorageKey)).toBeNull();
  });

  it('never copies malformed data into either storage location', () => {
    window.localStorage.setItem(authStorageKey, 'not-a-session');

    preserveSessionForBillingPortalReturn(authStorageKey);

    expect(window.sessionStorage.getItem(recoveryStorageKey)).toBeNull();
    window.localStorage.removeItem(authStorageKey);
    window.sessionStorage.setItem(recoveryStorageKey, 'not-a-session');

    expect(restoreSessionAfterBillingPortalReturn(authStorageKey)).toBe(false);
    expect(window.localStorage.getItem(authStorageKey)).toBeNull();
    expect(window.sessionStorage.getItem(recoveryStorageKey)).toBeNull();
  });
});
