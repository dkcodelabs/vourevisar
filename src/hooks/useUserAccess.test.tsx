import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useUserRole: vi.fn(),
  useSubscription: vi.fn(),
}));

vi.mock('./useUserRole', () => ({
  useUserRole: mocks.useUserRole,
}));

vi.mock('./useSubscription', () => ({
  useSubscription: mocks.useSubscription,
}));

import { useUserAccess } from './useUserAccess';

describe('useUserAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not keep an expired normal user in reconnecting state when role lookup fails', () => {
    mocks.useUserRole.mockReturnValue({
      loading: false,
      error: 'role lookup failed',
      isOwner: false,
      isAdmin: false,
      isModerator: false,
      refetch: vi.fn(),
    });
    mocks.useSubscription.mockReturnValue({
      loading: false,
      error: null,
      isActive: false,
      isPaid: false,
      isTrial: false,
      isExpired: true,
      daysRemaining: 0,
      planName: 'Free',
      subscription: null,
      hasSubscriptionRecord: false,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useUserAccess());

    expect(result.current.error).toBeNull();
    expect(result.current.hasFullAccess).toBe(false);
    expect(result.current.accessMessage).toBe('Assinatura expirada');
    expect(result.current.blockedReason).toBe('subscription_required');
  });

  it('still blocks routing on subscription lookup errors', () => {
    mocks.useUserRole.mockReturnValue({
      loading: false,
      error: null,
      isOwner: false,
      isAdmin: false,
      isModerator: false,
      refetch: vi.fn(),
    });
    mocks.useSubscription.mockReturnValue({
      loading: false,
      error: 'subscription lookup failed',
      isActive: false,
      isPaid: false,
      isTrial: false,
      isExpired: true,
      daysRemaining: 0,
      planName: 'Free',
      subscription: { user_id: 'user-1' },
      hasSubscriptionRecord: true,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useUserAccess());

    expect(result.current.error).toBe('subscription lookup failed');
    expect(result.current.hasFullAccess).toBe(false);
  });
});
