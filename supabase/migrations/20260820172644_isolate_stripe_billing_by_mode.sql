-- Keep Stripe customer mappings isolated by account mode. A user may have
-- one Test customer and one Live customer, but neither mapping may overwrite
-- the other or be selected by the wrong webhook/Edge Function.

ALTER TABLE public.billing_customers
  DROP CONSTRAINT IF EXISTS billing_customers_user_id_key,
  DROP CONSTRAINT IF EXISTS billing_customers_stripe_customer_id_key;

CREATE UNIQUE INDEX billing_customers_user_mode_key
  ON public.billing_customers (user_id, livemode);

CREATE UNIQUE INDEX billing_customers_stripe_customer_mode_key
  ON public.billing_customers (stripe_customer_id, livemode);

CREATE INDEX billing_customers_user_mode_updated_idx
  ON public.billing_customers (user_id, livemode, updated_at DESC);

DROP FUNCTION IF EXISTS public.get_stripe_billing_overview();

CREATE OR REPLACE FUNCTION public.get_stripe_billing_overview(
  p_livemode boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id uuid := auth.uid();
  current_customer_id uuid;
  current_customer_updated_at timestamptz;
  subscription_record public.billing_subscriptions%ROWTYPE;
  grant_record public.billing_access_grants%ROWTYPE;
  effective_plan text;
  effective_status text;
  effective_source text;
  effective_end timestamptz;
  subscription_effective_end timestamptz;
  is_active boolean := false;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT id, updated_at
  INTO current_customer_id, current_customer_updated_at
  FROM public.billing_customers
  WHERE user_id = caller_id
    AND livemode = p_livemode
  LIMIT 1;

  SELECT subscription.*
  INTO subscription_record
  FROM public.billing_subscriptions AS subscription
  JOIN public.billing_customers AS customer
    ON customer.id = subscription.billing_customer_id
  WHERE subscription.user_id = caller_id
    AND customer.livemode = p_livemode
    AND subscription.billing_customer_id = current_customer_id
    AND subscription.updated_at >= COALESCE(current_customer_updated_at, 'infinity'::timestamptz)
  ORDER BY
    CASE subscription.status
      WHEN 'active' THEN 1
      WHEN 'trialing' THEN 2
      WHEN 'past_due' THEN 3
      WHEN 'incomplete' THEN 4
      ELSE 5
    END,
    subscription.updated_at DESC
  LIMIT 1;

  IF subscription_record.id IS NOT NULL THEN
    subscription_effective_end := CASE
      WHEN subscription_record.cancel_at IS NOT NULL
        AND subscription_record.current_period_end IS NOT NULL
        THEN LEAST(subscription_record.cancel_at, subscription_record.current_period_end)
      ELSE COALESCE(subscription_record.cancel_at, subscription_record.current_period_end)
    END;
  END IF;

  SELECT access_grant.*
  INTO grant_record
  FROM public.billing_access_grants AS access_grant
  WHERE access_grant.user_id = caller_id
    AND access_grant.revoked_at IS NULL
    AND access_grant.starts_at <= now()
    AND access_grant.ends_at > now()
  ORDER BY
    CASE access_grant.source
      WHEN 'manual' THEN 1
      WHEN 'goodwill' THEN 2
      WHEN 'migration' THEN 3
      ELSE 4
    END,
    access_grant.ends_at DESC
  LIMIT 1;

  IF subscription_record.id IS NOT NULL
    AND subscription_record.status IN ('active', 'trialing', 'past_due')
    AND subscription_record.access_suspended_at IS NULL
    AND subscription_effective_end IS NOT NULL
    AND subscription_effective_end > now()
  THEN
    is_active := true;
    effective_plan := subscription_record.plan_code;
    effective_status := subscription_record.status;
    effective_source := 'stripe';
    effective_end := subscription_effective_end;
  ELSIF grant_record.id IS NOT NULL THEN
    is_active := true;
    effective_plan := grant_record.plan_code;
    effective_status := CASE
      WHEN grant_record.source = 'trial' THEN 'trial'
      ELSE 'active'
    END;
    effective_source := grant_record.source;
    effective_end := grant_record.ends_at;
  ELSE
    effective_plan := COALESCE(subscription_record.plan_code, 'free_trial');
    effective_status := COALESCE(subscription_record.status, 'inactive');
    effective_source := CASE
      WHEN subscription_record.id IS NOT NULL THEN 'stripe'
      ELSE 'none'
    END;
    effective_end := subscription_effective_end;
  END IF;

  RETURN jsonb_build_object(
    'is_active', is_active,
    'source', effective_source,
    'plan', effective_plan,
    'status', effective_status,
    'access_until', effective_end,
    'subscription', CASE
      WHEN subscription_record.id IS NULL OR effective_source <> 'stripe' THEN NULL
      ELSE jsonb_build_object(
        'plan', subscription_record.plan_code,
        'status', subscription_record.status,
        'amount_cents', subscription_record.amount_cents,
        'currency', subscription_record.currency,
        'billing_interval', subscription_record.billing_interval,
        'current_period_start', subscription_record.current_period_start,
        'current_period_end', subscription_record.current_period_end,
        'cancel_at_period_end', (
          subscription_record.cancel_at_period_end
          OR subscription_record.cancel_at IS NOT NULL
        ),
        'cancel_at', subscription_record.cancel_at,
        'canceled_at', subscription_record.canceled_at,
        'scheduled_plan', subscription_record.scheduled_plan_code,
        'card_brand', subscription_record.card_brand,
        'card_last4', subscription_record.card_last4,
        'access_suspended_at', subscription_record.access_suspended_at,
        'access_suspension_reason', subscription_record.access_suspension_reason,
        'updated_at', subscription_record.updated_at
      )
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_stripe_billing_overview(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_stripe_billing_overview(boolean) TO authenticated, service_role;
