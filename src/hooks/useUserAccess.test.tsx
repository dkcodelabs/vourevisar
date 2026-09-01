import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useUserRole: vi.fn(),
  useStripeBillingOverview: vi.fn(),
}));

vi.mock('./useUserRole', () => ({ useUserRole: mocks.useUserRole }));
vi.mock('@/features/billing/hooks/useStripeBilling', () => ({
  useStripeBillingOverview: mocks.useStripeBillingOverview,
}));

import { useUserAccess } from './useUserAccess';

const roleState = {
  loading: false,
  error: null,
  isOwner: false,
  isAdmin: false,
  isModerator: false,
  refetch: vi.fn(),
};

const billingState = (changes: Record<string, unknown> = {}) => ({
  isLoading: false,
  isError: false,
  error: null,
  data: {
    is_active: false,
    source: 'none',
    plan: 'free_trial',
    status: 'none',
    access_until: null,
    subscription: null,
  },
  refetch: vi.fn(),
  ...changes,
});

describe('useUserAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useUserRole.mockReturnValue(roleState);
  });

  it('authorizes protected routes from the canonical Stripe billing overview', () => {
    mocks.useStripeBillingOverview.mockReturnValue(billingState({
      data: {
        is_active: true,
        source: 'stripe',
        plan: 'monthly',
        status: 'active',
        access_until: '2026-09-01T00:00:00Z',
        subscription: { plan: 'monthly' },
      },
    }));

    const { result } = renderHook(() => useUserAccess());

    expect(result.current.hasFullAccess).toBe(true);
    expect(result.current.canAccessPremiumFeatures).toBe(true);
    expect(result.current.accessLevel).toBe('paid');
    expect(result.current.accessMessage).toBe('Plano mensal');
  });

  it('keeps a verified inactive user out of protected routes', () => {
    mocks.useStripeBillingOverview.mockReturnValue(billingState());

    const { result } = renderHook(() => useUserAccess());

    expect(result.current.error).toBeNull();
    expect(result.current.hasFullAccess).toBe(false);
    expect(result.current.blockedReason).toBe('subscription_required');
  });

  it('keeps a valid trial inside protected routes without treating it as a paid plan', () => {
    mocks.useStripeBillingOverview.mockReturnValue(billingState({
      data: {
        is_active: true,
        source: 'trial',
        plan: 'free_trial',
        status: 'trial',
        access_until: '2026-09-08T00:00:00Z',
        subscription: null,
      },
    }));

    const { result } = renderHook(() => useUserAccess());

    expect(result.current.hasFullAccess).toBe(true);
    expect(result.current.canAccessPremiumFeatures).toBe(false);
    expect(result.current.accessLevel).toBe('trial');
  });

  it('identifies an expired Stripe subscription for the renewal flow', () => {
    mocks.useStripeBillingOverview.mockReturnValue(billingState({
      data: {
        is_active: false,
        source: 'stripe',
        plan: 'monthly',
        status: 'canceled',
        access_until: '2026-08-31T00:00:00Z',
        subscription: { status: 'canceled' },
      },
    }));

    const { result } = renderHook(() => useUserAccess());

    expect(result.current.hasFullAccess).toBe(false);
    expect(result.current.blockedReason).toBe('subscription_expired');
  });

  it('does not redirect while the canonical access lookup is failing', () => {
    mocks.useStripeBillingOverview.mockReturnValue(billingState({
      isError: true,
      error: new Error('billing lookup failed'),
      data: undefined,
    }));

    const { result } = renderHook(() => useUserAccess());

    expect(result.current.error).toBe('billing lookup failed');
    expect(result.current.hasFullAccess).toBe(false);
    expect(result.current.blockedReason).toBe('unknown');
  });
});
