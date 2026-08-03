import { describe, expect, it } from 'vitest';
import type { BillingOverview } from '@/features/billing/types';
import { getBillingAccessLabel } from './billingAccessLabel';

const overview = (changes: Partial<BillingOverview>): BillingOverview => ({
  is_active: true,
  source: 'stripe',
  plan: 'monthly',
  status: 'active',
  access_until: null,
  subscription: null,
  ...changes,
});

describe('getBillingAccessLabel', () => {
  it('prioritizes the canonical Stripe plan over an old local trial', () => {
    expect(getBillingAccessLabel(overview({ plan: 'monthly' }))).toBe('Plano mensal');
    expect(getBillingAccessLabel(overview({ plan: 'annual' }))).toBe('Plano anual');
  });

  it('keeps trial, inactive and unavailable states explicit', () => {
    expect(getBillingAccessLabel(overview({ source: 'trial', plan: 'free_trial' }))).toBe('Teste gratuito');
    expect(getBillingAccessLabel(overview({ is_active: false, source: 'none' }))).toBe('Sem plano ativo');
    expect(getBillingAccessLabel(undefined)).toBe('Status indisponível');
  });
});
