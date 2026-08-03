import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Asaas checkout safety', () => {
  it('checks an existing external subscription before creating another one', () => {
    const source = readFileSync('supabase/functions/asaas-checkout/index.ts', 'utf8');

    expect(source).toContain('asaas_subscription_id');
    expect(source).toContain('/subscriptions/${subData.asaas_subscription_id}');
    expect(source).toContain("existingSubscriptionJson.status === 'ACTIVE'");
    expect(source).toContain('ASAAS_SUBSCRIPTION_ALREADY_ACTIVE');
  });

  it('does not consume a coupon before the duplicate subscription guard', () => {
    const source = readFileSync('supabase/functions/asaas-checkout/index.ts', 'utf8');
    const guardIndex = source.indexOf('if (subData?.asaas_subscription_id)');
    const couponIndex = source.indexOf(".rpc('use_coupon'");

    expect(guardIndex).toBeGreaterThan(-1);
    expect(couponIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeLessThan(couponIndex);
  });

  it('returns the created payment id so the checkout can verify the exact PIX charge', () => {
    const source = readFileSync('supabase/functions/asaas-checkout/index.ts', 'utf8');

    expect(source).toContain('let paymentId: string | null = null');
    expect(source).toContain('paymentId = chargesJson.data?.[0]?.id ?? null');
    expect(source).toContain('paymentId,');
  });

  it('looks up the immediate charge for card checkouts too', () => {
    const source = readFileSync('supabase/functions/asaas-checkout/index.ts', 'utf8');

    expect(source).toContain('/subscriptions/${subJson.id}/payments');
    expect(source).toContain("if (billingType === 'PIX')");
    expect(source).toContain('paymentId = chargesJson.data?.[0]?.id ?? null');
  });

  it('clears the previous cancellation marker when a new checkout is created', () => {
    const source = readFileSync('supabase/functions/asaas-checkout/index.ts', 'utf8');

    expect(source).toContain("cancel_at_period_end: false");
    expect(source).toContain("canceled_at: null");
    expect(source).toContain("status: 'expired'");
  });

  it('repairs an external active subscription after local access was revoked', () => {
    const source = readFileSync('supabase/functions/asaas-checkout/index.ts', 'utf8');

    expect(source).toContain('localAccessStillActive');
    expect(source).toContain("body: JSON.stringify({ status: 'INACTIVE' })");
    expect(source).toContain('encerrar a assinatura anterior no Asaas');
  });
});
