-- Preserve only the entitlement window of valid legacy paid periods while
-- Asaas and Stripe coexist. Financial/customer/provider records stay isolated.
INSERT INTO public.billing_access_grants (
  user_id,
  source,
  plan_code,
  starts_at,
  ends_at,
  reason
)
SELECT
  subscription.user_id,
  'migration',
  subscription.plan::text,
  COALESCE(
    subscription.subscription_started_at,
    subscription.last_payment_at,
    subscription.created_at,
    now()
  ),
  COALESCE(subscription.subscription_ends_at, subscription.next_billing_date),
  'Período pago legado preservado durante a migração Stripe'
FROM public.user_subscriptions AS subscription
WHERE subscription.plan IN ('monthly', 'annual')
  AND subscription.status IN ('active', 'canceled')
  AND COALESCE(subscription.subscription_ends_at, subscription.next_billing_date) > now()
  AND NOT EXISTS (
    SELECT 1
    FROM public.billing_access_grants AS existing_grant
    WHERE existing_grant.user_id = subscription.user_id
      AND existing_grant.source = 'migration'
      AND existing_grant.revoked_at IS NULL
      AND existing_grant.ends_at >= COALESCE(
        subscription.subscription_ends_at,
        subscription.next_billing_date
      )
  );
