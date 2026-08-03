import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (path: string) =>
  readFileSync(resolve(process.cwd(), path), 'utf8');

const checkoutSource = readProjectFile('supabase/functions/stripe-create-checkout/index.ts');
const catalogSource = readProjectFile('supabase/functions/stripe-catalog/index.ts');
const webhookSource = readProjectFile('supabase/functions/stripe-webhook/index.ts');
const sharedSource = readProjectFile('supabase/functions/_shared/stripeBilling.ts');
const migrationSource = readProjectFile(
  'supabase/migrations/20260730221919_create_stripe_billing_core.sql',
);
const legacyGrantMigrationSource = readProjectFile(
  'supabase/migrations/20260731170341_backfill_legacy_paid_access_grants.sql',
);
const legacyBridgeRemovalSource = readProjectFile(
  'supabase/migrations/20260731171535_revoke_legacy_billing_bridge.sql',
);
const flexibleCancellationMigrationSource = readProjectFile(
  'supabase/migrations/20260802170643_support_stripe_flexible_cancellation.sql',
);
const configSource = readProjectFile('supabase/config.toml');
const paymentFormSource = readProjectFile(
  'src/features/billing/components/StripePaymentForm.tsx',
);
const billingHookSource = readProjectFile(
  'src/features/billing/hooks/useStripeBilling.ts',
);
const userFacingBillingSource = [
  'src/pages/StripeCheckout.tsx',
  'src/pages/StripeCheckoutReturn.tsx',
  'src/pages/AccountSubscription.tsx',
  'src/pages/Planos.tsx',
  'src/features/billing/components/BillingArtwork.tsx',
  'src/features/billing/components/StripePaymentForm.tsx',
].map(readProjectFile).join('\n');

describe('Stripe billing security boundaries', () => {
  it('keeps plan prices allowlisted on the server and checkout idempotent', () => {
    expect(checkoutSource).toContain('getPlanPriceId(plan)');
    expect(sharedSource).toContain('STRIPE_MONTHLY_PRICE_ID');
    expect(sharedSource).toContain('STRIPE_ANNUAL_PRICE_ID');
    expect(checkoutSource).toContain('CHECKOUT_IDEMPOTENCY_VERSION = "elements-v1"');
    expect(checkoutSource).toContain(
      '`billing-checkout:${CHECKOUT_IDEMPOTENCY_VERSION}:${user.id}:${requestId}`',
    );
    expect(checkoutSource).not.toContain('user_subscriptions');
    expect(checkoutSource).toContain('status: "failed", error_code: diagnosticCode');
    expect(checkoutSource).toContain('safeStripeErrorFingerprint(error, stage)');
    expect(sharedSource).toContain('stripe.param ?? "none"');
    expect(checkoutSource).toContain('stripe_checkout_session_id: null');
  });

  it('serves display prices from the allowlisted Stripe catalog without legacy tables', () => {
    expect(catalogSource).toContain('stripe.prices.retrieve(getPlanPriceId(code)');
    expect(catalogSource).toContain('amountCents: price.unit_amount');
    expect(catalogSource).not.toContain('plan_configs');
    expect(catalogSource).not.toContain('user_subscriptions');
  });

  it('uses Stripe Elements Checkout instead of collecting raw card fields', () => {
    expect(checkoutSource).toContain('ui_mode: "elements"');
    expect(checkoutSource).toContain('payment_method_types: ["card"]');
    expect(paymentFormSource).toContain('<PaymentElement');
    expect(paymentFormSource).toContain('checkout.confirm()');
    expect(paymentFormSource).not.toContain('returnUrl:');
    expect(paymentFormSource).toContain('finally {');
    expect(paymentFormSource).not.toMatch(/cardNumber|card_number|cvc/i);
  });

  it('keeps provider internals out of user-facing billing messages', () => {
    expect(userFacingBillingSource).not.toMatch(/Liberado por webhook|Stripe em configuração|sessão segura/i);
    expect(userFacingBillingSource).not.toContain('checkout.error.message');
    expect(userFacingBillingSource).not.toContain('portal.error.message');
    expect(paymentFormSource).not.toContain('result.error.message');
  });

  it('requires a valid Stripe signature and no Supabase JWT on the webhook', () => {
    expect(webhookSource).toContain('stripe-signature');
    expect(webhookSource).toContain('constructEventAsync');
    expect(webhookSource).toContain('STRIPE_WEBHOOK_SECRET');
    expect(configSource).toContain('[functions.stripe-webhook]\nverify_jwt = false');
  });

  it('does not let an old refund or dispute revoke a newer paid period', () => {
    expect(webhookSource).toContain('chargeSustainsCurrentAccess');
    expect(webhookSource).toContain('latest_invoice_id');
    expect(webhookSource).toContain('data?.latest_invoice_id === invoiceId');
  });

  it('supports scheduled cancellation in Stripe classic and flexible billing modes', () => {
    expect(webhookSource).toContain('cancel_at: fromUnixSeconds(subscription.cancel_at)');
    expect(flexibleCancellationMigrationSource).toContain(
      'ADD COLUMN IF NOT EXISTS cancel_at timestamptz',
    );
    expect(flexibleCancellationMigrationSource).toContain(
      'subscription_record.cancel_at_period_end\n          OR subscription_record.cancel_at IS NOT NULL',
    );
    expect(flexibleCancellationMigrationSource).toContain(
      'LEAST(subscription_record.cancel_at, subscription_record.current_period_end)',
    );
    expect(billingHookSource).toContain("refetchOnMount: 'always'");
    expect(billingHookSource).toContain('refetchOnWindowFocus: true');
  });

  it('blocks direct browser access to billing tables', () => {
    const tables = [
      'billing_customers',
      'billing_subscriptions',
      'billing_checkout_attempts',
      'billing_access_grants',
      'billing_webhook_events',
    ];

    for (const table of tables) {
      expect(migrationSource).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
      expect(migrationSource).toContain(
        `REVOKE ALL ON TABLE public.${table} FROM PUBLIC, anon, authenticated`,
      );
    }
  });

  it('exposes only an authenticated sanitized RPC', () => {
    expect(migrationSource).toContain('CREATE OR REPLACE FUNCTION public.get_stripe_billing_overview()');
    expect(migrationSource).toContain('SECURITY DEFINER');
    expect(migrationSource).toContain("SET search_path = ''");
    expect(migrationSource).toContain('caller_id uuid := auth.uid()');
    expect(migrationSource).toContain(
      'REVOKE ALL ON FUNCTION public.get_stripe_billing_overview() FROM PUBLIC, anon',
    );
  });

  it('keeps historical migration safe and revokes its active bridge', () => {
    expect(legacyGrantMigrationSource).toContain("subscription.status IN ('active', 'canceled')");
    expect(legacyGrantMigrationSource).toContain(
      'COALESCE(subscription.subscription_ends_at, subscription.next_billing_date) > now()',
    );
    expect(legacyGrantMigrationSource).not.toMatch(/asaas_customer_id|asaas_subscription_id|asaas_payment_id/);
    expect(legacyBridgeRemovalSource).toContain("WHERE source = 'migration'");
    expect(legacyBridgeRemovalSource).toContain('revoked_at = COALESCE(revoked_at, now())');
  });
});
