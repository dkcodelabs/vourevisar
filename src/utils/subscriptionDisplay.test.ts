import { describe, expect, it } from 'vitest';
import {
  getSubscriptionRemainingLabel,
  getSubscriptionRenewalLabel,
} from './subscriptionDisplay';

const now = new Date('2026-07-18T12:00:00.000Z');

describe('subscription display helpers', () => {
  it('does not call an expired trial due today', () => {
    expect(getSubscriptionRemainingLabel({
      plan: 'free_trial',
      status: 'expired',
      renewalDate: '2025-11-22',
      now,
    })).toBe('Encerrado');
  });

  it('shows due today only for an active subscription ending today', () => {
    expect(getSubscriptionRemainingLabel({
      plan: 'monthly',
      status: 'active',
      renewalDate: '2026-07-18T12:00:00.000Z',
      now,
    })).toBe('Vence hoje');
  });

  it('uses the trial-specific date label', () => {
    expect(getSubscriptionRenewalLabel('free_trial')).toBe('Fim do teste');
    expect(getSubscriptionRenewalLabel('monthly')).toBe('Próxima cobrança');
  });
});
