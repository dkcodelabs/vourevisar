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

  it('explains when the signed-in account has never had an entitlement', () => {
    expect(getBillingAccessRecoveryState(inactiveOverview)).toMatchObject({
      kind: 'access_required',
      title: 'Esta conta ainda não possui acesso',
      description: expect.stringContaining('plano, teste ou cortesia'),
      actionLabel: 'Escolher um plano',
      endedAt: null,
    });
  });

  it.each([
    [{ ...inactiveOverview, last_expired_access: { kind: 'initial_trial' as const, ended_at: '2026-09-07T00:00:00Z' } }, 'Seu teste de 7 dias terminou'],
    [{ ...inactiveOverview, last_expired_access: { kind: 'courtesy' as const, ended_at: '2026-09-07T00:00:00Z' } }, 'Sua cortesia terminou'],
    [{ ...inactiveOverview, source: 'stripe' as const, status: 'canceled', access_until: '2026-09-07T00:00:00Z' }, 'Sua assinatura foi encerrada'],
    [{ ...inactiveOverview, source: 'stripe' as const, status: 'unpaid', subscription: { status: 'unpaid' as const, access_suspended_at: '2026-09-07T00:00:00Z' } }, 'Seu pagamento precisa de atenção'],
  ])('keeps the access cause explicit: %s', (overview, title) => {
    expect(getBillingAccessRecoveryState(overview)?.title).toBe(title);
  });
});
