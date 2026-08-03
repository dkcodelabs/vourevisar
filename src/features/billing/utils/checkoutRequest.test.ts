import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCheckoutRequestIds, getCheckoutRequestId } from './checkoutRequest';

describe('checkout request id', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('reuses the same id while the checkout is still in progress', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-4111-8111-111111111111');

    expect(getCheckoutRequestId('monthly')).toBe('11111111-1111-4111-8111-111111111111');
    expect(getCheckoutRequestId('monthly')).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('clears completed checkout ids so a later purchase starts fresh', () => {
    sessionStorage.setItem('stripe-checkout-request:monthly', 'old-monthly');
    sessionStorage.setItem('stripe-checkout-request:annual', 'old-annual');

    clearCheckoutRequestIds();

    expect(sessionStorage.getItem('stripe-checkout-request:monthly')).toBeNull();
    expect(sessionStorage.getItem('stripe-checkout-request:annual')).toBeNull();
  });
});
