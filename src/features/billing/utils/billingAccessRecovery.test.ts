import { describe, expect, it } from 'vitest';
import type { BillingOverview } from '@/features/billing/types';
import {
  getBillingAccessRecoveryState,
  getCurrentAccessName,
} from '@/features/billing/utils/billingAccessRecovery';

const inactiveOverview: BillingOverview = {
  is_active: false,
  source: 'none',
  plan: 'free_trial',
  status: 'inactive',
  access_until: null,
  subscription: null,
};

describe('billingAccessRecovery', () => {
  it('distinguishes the initial trial from an administrative courtesy', () => {
    expect(getBillingAccessRecoveryState({
      ...inactiveOverview,
      last_expired_access: { kind: 'initial_trial', ended_at: '2026-09-07T00:00:00Z' },
    })?.kind).toBe('initial_trial_expired');

    expect(getBillingAccessRecoveryState({
      ...inactiveOverview,
      last_expired_access: { kind: 'courtesy', ended_at: '2026-09-10T00:00:00Z' },
    })?.kind).toBe('courtesy_expired');
  });

  it('does not expose a recovery state while access is active', () => {
    expect(getBillingAccessRecoveryState({
      ...inactiveOverview,
      is_active: true,
      source: 'goodwill',
      access_until: '2026-09-10T00:00:00Z',
    })).toBeNull();
  });

  it('labels active courtesy access without calling it a trial', () => {
    expect(getCurrentAccessName({
      ...inactiveOverview,
      is_active: true,
      source: 'manual',
      access_until: '2026-09-10T00:00:00Z',
    })).toBe('Cortesia');
  });
});
