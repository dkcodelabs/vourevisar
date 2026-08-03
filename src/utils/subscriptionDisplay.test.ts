import { describe, expect, it } from 'vitest';
import {
  getSubscriptionDisplayDate,
  getSubscriptionDisplayDateLabel,
  getSubscriptionAccessStatusLabel,
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

  it('shows the paid access end for Pix instead of a fake next charge', () => {
    const input = {
      plan: 'annual',
      status: 'active',
      billingType: 'PIX',
      nextBillingDate: '2027-07-26',
      subscriptionEndsAt: '2027-07-26',
    };

    expect(getSubscriptionDisplayDateLabel(input)).toBe('Acesso até');
    expect(getSubscriptionDisplayDate(input)).toBe('2027-07-26');
  });

  it('shows the next charge only for an active card renewal', () => {
    const input = {
      plan: 'monthly',
      status: 'active',
      billingType: 'CREDIT_CARD',
      nextBillingDate: '2026-08-27',
      subscriptionEndsAt: '2026-08-27',
    };

    expect(getSubscriptionDisplayDateLabel(input)).toBe('Próxima cobrança');
    expect(getSubscriptionDisplayDate(input)).toBe('2026-08-27');
  });

  it('shows the access end when card renewal is canceled', () => {
    const input = {
      plan: 'annual',
      status: 'active',
      billingType: 'CREDIT_CARD',
      nextBillingDate: '2027-07-26',
      subscriptionEndsAt: '2027-07-26',
      cancelAtPeriodEnd: true,
    };

    expect(getSubscriptionDisplayDateLabel(input)).toBe('Acesso até');
    expect(getSubscriptionDisplayDate(input)).toBe('2027-07-26');
  });

  it('keeps canceled access active until the paid period ends', () => {
    expect(getSubscriptionAccessStatusLabel({
      plan: 'annual',
      status: 'canceled',
      billingType: 'PIX',
      subscriptionEndsAt: '2027-07-26',
      now,
    })).toBe('Ativo até o fim do período');
  });

  it('shows remaining days for canceled access before the paid period ends', () => {
    expect(getSubscriptionRemainingLabel({
      plan: 'annual',
      status: 'canceled',
      renewalDate: '2026-07-26',
      now,
    })).toBe('8 dias');
  });
});
