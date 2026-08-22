import { describe, expect, it } from 'vitest';
import type { BillingOverview, BillingSubscription } from '@/features/billing/types';
import { getAccountSubscriptionState } from './accountSubscriptionState';

const subscription = (changes: Partial<BillingSubscription> = {}): BillingSubscription => ({
  plan: 'monthly',
  status: 'active',
  amount_cents: 1600,
  currency: 'brl',
  billing_interval: 'month',
  current_period_start: '2026-09-02T00:00:00.000Z',
  current_period_end: '2026-10-02T00:00:00.000Z',
  cancel_at_period_end: false,
  cancel_at: null,
  canceled_at: null,
  scheduled_plan: null,
  card_brand: 'visa',
  card_last4: '0341',
  access_suspended_at: null,
  access_suspension_reason: null,
  updated_at: '2026-09-17T00:00:00.000Z',
  ...changes,
});

const overview = (changes: Partial<BillingOverview> = {}): BillingOverview => ({
  is_active: true,
  source: 'stripe',
  plan: 'monthly',
  status: 'active',
  access_until: '2026-10-02T00:00:00.000Z',
  subscription: subscription(),
  ...changes,
});

describe('getAccountSubscriptionState', () => {
  it('never presents a canceled Stripe subscription as a future renewal', () => {
    const state = getAccountSubscriptionState(overview({
      is_active: false,
      status: 'canceled',
      subscription: subscription({ status: 'canceled', canceled_at: '2026-09-17T00:00:00.000Z' }),
    }), false);

    expect(state.kind).toBe('ended');
    expect(state.badge).toBe('Assinatura encerrada');
    expect(state.summaryLabel).toBe('Renovação');
    expect(state.summaryValue).toBe('Sem renovação ativa');
    expect(state.primaryAction).toBe('plans');
    expect(state.primaryActionLabel).toBe('Escolher novo plano');
    expect(state.asideDescription).toBe(
      'Escolha um novo plano para recuperar o acesso. Suas cobranças anteriores ficam disponíveis apenas para consulta.',
    );
    expect(state.artworkNextStep).toBe('Retomar assinatura');
  });

  it('directs a past-due subscriber to update payment without claiming renewal', () => {
    const state = getAccountSubscriptionState(overview({
      status: 'past_due',
      subscription: subscription({ status: 'past_due' }),
    }), false);

    expect(state.kind).toBe('payment_attention');
    expect(state.summaryLabel).toBe('Período vigente até');
    expect(state.primaryAction).toBe('portal');
    expect(state.primaryActionLabel).toBe('Atualizar pagamento');
  });

  it('keeps cancel-at-period-end distinct from a terminated subscription', () => {
    const state = getAccountSubscriptionState(overview({
      subscription: subscription({ cancel_at: '2026-10-02T00:00:00.000Z' }),
    }), false);

    expect(state.kind).toBe('ending');
    expect(state.badge).toBe('Renovação cancelada');
    expect(state.summaryLabel).toBe('Acesso até');
    expect(state.primaryAction).toBe('portal');
  });

  it('keeps an unpaid subscription recoverable through the existing invoice', () => {
    const state = getAccountSubscriptionState(overview({
      is_active: false,
      status: 'unpaid',
      subscription: subscription({ status: 'unpaid' }),
    }), false);

    expect(state.kind).toBe('payment_attention');
    expect(state.badge).toBe('Acesso suspenso');
    expect(state.primaryAction).toBe('portal');
    expect(state.primaryActionLabel).toBe('Regularizar pagamento');
  });
});
