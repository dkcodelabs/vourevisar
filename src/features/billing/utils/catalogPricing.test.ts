import { describe, expect, it } from 'vitest';
import { buildStripePricingPlans } from '@/features/billing/utils/catalogPricing';
import type { BillingCatalogPlan } from '@/features/billing/types';

const plan = (
  code: BillingCatalogPlan['code'],
  amountCents: number,
): BillingCatalogPlan => ({
  code,
  name: code === 'monthly' ? 'Mensal' : 'Anual',
  amountCents,
  currency: 'brl',
  interval: code === 'monthly' ? 'month' : 'year',
  metadata: {},
});

describe('buildStripePricingPlans', () => {
  it('uses Stripe cents as the only displayed price source', () => {
    const result = buildStripePricingPlans([
      plan('monthly', 1600),
      plan('annual', 9900),
    ]);

    expect(result?.monthly.value).toBe(16);
    expect(result?.annual.value).toBe(99);
  });

  it('does not invent a price when a Stripe plan is unavailable', () => {
    expect(buildStripePricingPlans([plan('monthly', 1600)])).toBeNull();
  });
});
