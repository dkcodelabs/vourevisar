-- Reconcile a confirmed historical Live subscription that was persisted against
-- a Test-mode customer mapping. This migration intentionally changes only the
-- local foreign-key relationship; it never calls Stripe or changes payment,
-- cancellation, refund, plan, or access-grant fields.
--
-- Evidence captured before this migration:
--   Live subscription: sub_1U68zGQ2ZdcaFdY4unbQPnNB
--   Live Stripe customer: cus_V6AYqAzb7X1thG
--   Supabase user: 0eef9295-9a9e-4bec-a2da-d8eca909ed66

DO $$
DECLARE
  target_user_id uuid := '0eef9295-9a9e-4bec-a2da-d8eca909ed66';
  target_subscription_id uuid := 'a641f8c1-672c-4346-b5ba-7232680ceb32';
  expected_subscription_id text := 'sub_1U68zGQ2ZdcaFdY4unbQPnNB';
  expected_live_customer_id text := 'cus_V6AYqAzb7X1thG';
  subscription_updated_at timestamptz;
  live_customer_row_id uuid;
  existing_live_customer_id text;
  updated_rows integer;
BEGIN
  SELECT updated_at
  INTO subscription_updated_at
  FROM public.billing_subscriptions
  WHERE id = target_subscription_id
    AND user_id = target_user_id
    AND stripe_subscription_id = expected_subscription_id
  FOR UPDATE;

  IF subscription_updated_at IS NULL THEN
    RAISE EXCEPTION 'billing_reconciliation_target_not_found';
  END IF;

  SELECT id, stripe_customer_id
  INTO live_customer_row_id, existing_live_customer_id
  FROM public.billing_customers
  WHERE user_id = target_user_id
    AND livemode = true
  FOR UPDATE;

  IF live_customer_row_id IS NOT NULL
    AND existing_live_customer_id <> expected_live_customer_id
  THEN
    RAISE EXCEPTION 'billing_reconciliation_live_customer_conflict';
  END IF;

  IF live_customer_row_id IS NULL THEN
    INSERT INTO public.billing_customers (
      user_id,
      stripe_customer_id,
      livemode,
      created_at,
      updated_at
    ) VALUES (
      target_user_id,
      expected_live_customer_id,
      true,
      subscription_updated_at,
      subscription_updated_at
    )
    RETURNING id INTO live_customer_row_id;
  END IF;

  UPDATE public.billing_subscriptions
  SET billing_customer_id = live_customer_row_id
  WHERE id = target_subscription_id
    AND user_id = target_user_id
    AND stripe_subscription_id = expected_subscription_id
    AND billing_customer_id <> live_customer_row_id;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  IF updated_rows <> 1 THEN
    RAISE EXCEPTION 'billing_reconciliation_subscription_not_updated';
  END IF;
END;
$$;
