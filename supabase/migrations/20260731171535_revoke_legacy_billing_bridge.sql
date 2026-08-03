-- The Stripe billing domain is intentionally independent from Asaas. There are
-- no real paid users to migrate, so legacy grants are revoked instead of being
-- considered by the new subscription surfaces or checkout.
UPDATE public.billing_access_grants
SET
  revoked_at = COALESCE(revoked_at, now()),
  reason = COALESCE(reason, 'Ponte legada revogada: billing Stripe isolado')
WHERE source = 'migration'
  AND revoked_at IS NULL;
