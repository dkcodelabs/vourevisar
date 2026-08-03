import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'supabase/functions/asaas-webhook/index.ts'), 'utf8');
const config = readFileSync(resolve(process.cwd(), 'supabase/config.toml'), 'utf8');

describe('Asaas webhook subscription safety', () => {
  it('accepts subscription lifecycle events, not only payment events', () => {
    expect(source).toContain('SUBSCRIPTION_INACTIVATED');
    expect(source).toContain('SUBSCRIPTION_DELETED');
    expect(source).toContain('body.subscription');
  });

  it('preserves paid access when a pending charge is deleted', () => {
    expect(source).toContain("event === 'SUBSCRIPTION_INACTIVATED' || event === 'SUBSCRIPTION_DELETED'");
    expect(source).toContain('const periodEnd = subscription.subscription_ends_at || subscription.next_billing_date');
    expect(source).toContain("status: hasPaidAccess ? 'active' : 'canceled'");
  });

  it('does not clear a cancellation when a late payment arrives', () => {
    expect(source).toContain('currentPaymentIsEntitlement');
    expect(source).toContain("cancel_at_period_end: true");
  });

  it('requires the Asaas webhook secret instead of accepting unsigned events', () => {
    expect(source).toContain("if (!webhookToken || !supabaseUrl || !serviceRoleKey)");
    expect(source).toContain("req.headers.get('asaas-access-token') !== webhookToken");
  });

  it('does not require a Supabase JWT from the Asaas webhook sender', () => {
    expect(config).toContain('[functions.asaas-webhook]');
    expect(config).toContain('[functions.asaas-webhook]\nverify_jwt = false');
  });

  it('inactivates the external recurring subscription after a refund', () => {
    expect(source).toContain("event === 'PAYMENT_REFUNDED'");
    expect(source).toContain("body: JSON.stringify({ status: 'INACTIVE' })");
    expect(source).toContain('estorno antigo ignorado para preservar acesso válido');
  });
});
