import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (path: string) =>
  readFileSync(resolve(process.cwd(), path), 'utf8');

const checkoutSource = readProjectFile('supabase/functions/stripe-create-checkout/index.ts');
const catalogSource = readProjectFile('supabase/functions/stripe-catalog/index.ts');
const invoiceHistorySource = readProjectFile('supabase/functions/stripe-invoice-history/index.ts');
const adminBillingSource = readProjectFile('supabase/functions/admin-billing/index.ts');
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
const sidebarSubscriptionSource = readProjectFile('src/hooks/useSubscriptionInfo.ts');
const userManagementSource = readProjectFile('src/pages/admin/UserManagement.tsx');
const importEditalSource = readProjectFile('src/components/subjects/ImportEditalModal.tsx');
const extractEditalSource = readProjectFile('supabase/functions/extract-edital/index.ts');
const processTopicIncidenceSource = readProjectFile('supabase/functions/process-topic-incidence/index.ts');
const aiQuotaMigrationSource = readProjectFile(
  'supabase/migrations/20260804170000_move_ai_quota_off_legacy_subscriptions.sql',
);
const legacyTableRetirementSource = readProjectFile(
  'supabase/migrations/20260804173000_remove_legacy_subscription_table.sql',
);
const finalAsaasResidueRemovalSource = readProjectFile(
  'supabase/migrations/20260804174500_remove_final_asaas_schema_residue.sql',
);
const couponFunctionRetirementSource = readProjectFile(
  'supabase/migrations/20260804175500_remove_asaas_coupon_function_parameter.sql',
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

  it('keeps terminated-account invoice history authenticated, read-only and free of payment links', () => {
    expect(configSource).toContain('[functions.stripe-invoice-history]\nverify_jwt = true');
    expect(invoiceHistorySource).toContain('requireAuthenticatedUser(request, supabase)');
    expect(invoiceHistorySource).toContain('.eq("user_id", user.id)');
    expect(invoiceHistorySource).toContain('stripe.invoices.list');
    expect(invoiceHistorySource).not.toMatch(/hosted_invoice_url|invoice_pdf|payment_url/i);
  });

  it('does not let an old refund or dispute revoke a newer paid period', () => {
    expect(webhookSource).toContain('chargeSustainsCurrentAccess');
    expect(webhookSource).toContain('latest_invoice_id');
    expect(webhookSource).toContain('data?.latest_invoice_id === invoiceId');
    expect(webhookSource).toContain('resolveChargeInvoiceId');
    expect(webhookSource).toContain('stripe.paymentIntents.retrieve(paymentIntentId)');
    expect(webhookSource).toContain('payment_details?.order_reference');
    expect(webhookSource).toContain('supabase: ServiceClient,\n  stripe: Stripe,\n  subscriptionId: string');
    expect(webhookSource).toContain('chargeSustainsCurrentAccess(supabase, stripe, subscriptionId, charge)');
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

  it('gives the admin panel the same canonical access contract without any legacy billing dependency', () => {
    expect(adminBillingSource).toContain('requireAdmin(actor.id, supabase)');
    expect(adminBillingSource).toContain('from("billing_subscriptions")');
    expect(adminBillingSource).toContain('from("billing_access_grants")');
    expect(adminBillingSource).not.toContain('user_subscriptions');
    expect(adminBillingSource).not.toMatch(/asaas_/i);
  });

  it('keeps account suspension separate from subscription and entitlement records', () => {
    expect(userManagementSource).toContain('Suspender conta');
    expect(userManagementSource).toContain('Reativar conta');
    expect(userManagementSource).not.toMatch(
      /from\(["']user_subscriptions["']\)\.(update|insert|upsert|delete)/,
    );
    expect(userManagementSource).not.toMatch(
      /from\(["']billing_(subscriptions|access_grants)["']\)\.(update|insert|upsert|delete)/,
    );
  });

  it('derives the sidebar subscription summary from the canonical billing overview', () => {
    expect(sidebarSubscriptionSource).toContain('useStripeBillingOverview');
    expect(sidebarSubscriptionSource).not.toContain('user_subscriptions');
    expect(sidebarSubscriptionSource).not.toMatch(/asaas_/i);
  });

  it('derives AI quotas and paid-only processing from the canonical billing domain', () => {
    expect(aiQuotaMigrationSource).toContain('public.billing_subscriptions');
    expect(aiQuotaMigrationSource).toContain('public.billing_access_grants');
    expect(aiQuotaMigrationSource).toContain('public.user_ai_quota_resets');
    expect(importEditalSource).not.toContain('user_subscriptions');
    expect(extractEditalSource).not.toContain('user_subscriptions');
    expect(processTopicIncidenceSource).not.toContain('user_subscriptions');
    expect(extractEditalSource).toContain('AI_QUOTA_UNAVAILABLE');
  });

  it('retires the legacy subscription table after moving all active contracts', () => {
    expect(legacyTableRetirementSource).toContain('CREATE OR REPLACE FUNCTION public.handle_new_user()');
    expect(legacyTableRetirementSource).toContain('public.billing_access_grants');
    expect(legacyTableRetirementSource).toContain('CREATE OR REPLACE FUNCTION public.get_subscription_info');
    expect(legacyTableRetirementSource).toContain('DROP FUNCTION IF EXISTS public.has_active_subscription(uuid)');
    expect(legacyTableRetirementSource).toContain('DROP TABLE public.payment_history');
    expect(legacyTableRetirementSource).toContain('DROP TABLE public.user_subscriptions');
  });

  it('removes the final provider-specific schema and coupon function residue', () => {
    expect(finalAsaasResidueRemovalSource).toContain(
      'DROP COLUMN IF EXISTS asaas_subscription_id',
    );
    expect(finalAsaasResidueRemovalSource).not.toContain('payment_history WHERE');
    expect(couponFunctionRetirementSource).toContain(
      'DROP FUNCTION IF EXISTS public.use_coupon(text, uuid, text)',
    );
    expect(couponFunctionRetirementSource).toContain(
      'CREATE FUNCTION public.use_coupon(target_coupon_code text, target_user_id uuid)',
    );
    expect(couponFunctionRetirementSource).not.toContain('asaas_');
  });
});
