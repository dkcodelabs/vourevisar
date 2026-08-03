import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('asaas-account Edge Function boundary', () => {
  it('validates the authenticated user and never accepts a subscription id from the request body', () => {
    const source = readFileSync('supabase/functions/asaas-account/index.ts', 'utf8');

    expect(source).toContain('auth.getUser(token)');
    expect(source).toContain(".eq('user_id', user.id)");
    expect(source).toContain('/subscriptions/${subscription.asaas_subscription_id}');
    expect(source).toContain("body.action === 'cancel_renewal'");
    expect(source).toContain("status: 'INACTIVE'");
    expect(source).toContain("cancel_at_period_end: true");
    expect(source).toContain("subscription_ends_at: endDate");
    expect(source).not.toContain('params.subscriptionId');
    expect(source).not.toContain('asaas-admin');
  });

  it('reativa um período pago confirmado e preserva a data do Asaas', () => {
    const source = readFileSync('supabase/functions/asaas-account/index.ts', 'utf8');

    expect(source).toContain("status: 'active'");
    expect(source).toContain('mapAsaasCycleToPlan');
    expect(source).toContain('new Date(paidPeriodEnd).getTime() > Date.now()');
    expect(source).toContain("const renewalCanceled = subscription.cancel_at_period_end || asaasSubscription.status === 'INACTIVE'");
    expect(source).toContain('cancel_at_period_end: renewalCanceled');
    expect(source).toContain('subscription_ends_at: paidPeriodEnd');
  });

  it('não reabre o acesso local quando o último pagamento foi estornado', () => {
    const source = readFileSync('supabase/functions/asaas-account/index.ts', 'utf8');

    expect(source).toContain(".filter((payment) => payment.status === 'REFUNDED')");
    expect(source).toContain('payment.clientPaymentDate ?? payment.paymentDate ?? payment.dateCreated');
    expect(source).toContain('const refundRevokesAccess = Boolean(');
    expect(source).toContain("localStatus = refundRevokesAccess\n    ? 'canceled'");
    expect(source).toContain('next_billing_date: refundRevokesAccess || renewalCanceled || !hasAutomaticRenewal');
  });
});
