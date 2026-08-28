-- Stripe billing core.
--
-- This domain intentionally lives beside the legacy Asaas tables during the
-- migration. The browser has no direct access to any table below: authenticated
-- users read a sanitized projection through get_stripe_billing_overview().

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE public.billing_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
  provider text NOT NULL DEFAULT 'stripe' CHECK (provider = 'stripe'),
  stripe_customer_id text NOT NULL UNIQUE,
  livemode boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  billing_customer_id uuid NOT NULL REFERENCES public.billing_customers(id) ON DELETE RESTRICT,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_product_id text NOT NULL,
  stripe_price_id text NOT NULL,
  plan_code text NOT NULL CHECK (plan_code IN ('monthly', 'annual')),
  status text NOT NULL CHECK (
    status IN (
      'incomplete',
      'incomplete_expired',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused'
    )
  ),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'brl' CHECK (currency ~ '^[a-z]{3}$'),
  billing_interval text NOT NULL CHECK (billing_interval IN ('month', 'year')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  scheduled_plan_code text CHECK (scheduled_plan_code IN ('monthly', 'annual')),
  stripe_schedule_id text UNIQUE,
  latest_invoice_id text,
  default_payment_method_id text,
  card_brand text,
  card_last4 text CHECK (card_last4 IS NULL OR card_last4 ~ '^[0-9]{4}$'),
  access_suspended_at timestamptz,
  access_suspension_reason text,
  access_restored_at timestamptz,
  provider_created_at timestamptz,
  last_event_created_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.billing_checkout_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  request_id uuid NOT NULL UNIQUE,
  plan_code text NOT NULL CHECK (plan_code IN ('monthly', 'annual')),
  stripe_checkout_session_id text UNIQUE,
  status text NOT NULL DEFAULT 'creating' CHECK (
    status IN ('creating', 'open', 'complete', 'expired', 'failed')
  ),
  expires_at timestamptz,
  completed_at timestamptz,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.billing_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  source text NOT NULL CHECK (source IN ('trial', 'manual', 'goodwill', 'migration')),
  plan_code text NOT NULL CHECK (plan_code IN ('free_trial', 'monthly', 'annual')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  revoked_at timestamptz,
  reason text,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE public.billing_webhook_events (
  stripe_event_id text PRIMARY KEY,
  event_type text NOT NULL,
  stripe_object_id text,
  livemode boolean NOT NULL,
  event_created_at timestamptz NOT NULL,
  processing_status text NOT NULL DEFAULT 'processing' CHECK (
    processing_status IN ('processing', 'processed', 'failed', 'ignored')
  ),
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts > 0),
  error_code text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE UNIQUE INDEX billing_access_grants_one_trial_per_user
  ON public.billing_access_grants (user_id)
  WHERE source = 'trial';

CREATE INDEX billing_subscriptions_user_updated_idx
  ON public.billing_subscriptions (user_id, updated_at DESC);

CREATE INDEX billing_subscriptions_customer_idx
  ON public.billing_subscriptions (billing_customer_id);

CREATE INDEX billing_checkout_attempts_open_idx
  ON public.billing_checkout_attempts (user_id, expires_at DESC)
  WHERE status IN ('creating', 'open');

CREATE INDEX billing_access_grants_active_idx
  ON public.billing_access_grants (user_id, ends_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX billing_webhook_events_status_idx
  ON public.billing_webhook_events (processing_status, received_at);

ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_checkout_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.billing_customers FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.billing_subscriptions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.billing_checkout_attempts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.billing_access_grants FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.billing_webhook_events FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.billing_customers TO service_role;
GRANT ALL ON TABLE public.billing_subscriptions TO service_role;
GRANT ALL ON TABLE public.billing_checkout_attempts TO service_role;
GRANT ALL ON TABLE public.billing_access_grants TO service_role;
GRANT ALL ON TABLE public.billing_webhook_events TO service_role;

CREATE OR REPLACE FUNCTION private.set_billing_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER billing_customers_set_updated_at
BEFORE UPDATE ON public.billing_customers
FOR EACH ROW EXECUTE FUNCTION private.set_billing_updated_at();

CREATE TRIGGER billing_subscriptions_set_updated_at
BEFORE UPDATE ON public.billing_subscriptions
FOR EACH ROW EXECUTE FUNCTION private.set_billing_updated_at();

CREATE TRIGGER billing_checkout_attempts_set_updated_at
BEFORE UPDATE ON public.billing_checkout_attempts
FOR EACH ROW EXECUTE FUNCTION private.set_billing_updated_at();

CREATE OR REPLACE FUNCTION public.get_stripe_billing_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id uuid := auth.uid();
  subscription_record public.billing_subscriptions%ROWTYPE;
  grant_record public.billing_access_grants%ROWTYPE;
  effective_plan text;
  effective_status text;
  effective_source text;
  effective_end timestamptz;
  is_active boolean := false;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT subscription.*
  INTO subscription_record
  FROM public.billing_subscriptions AS subscription
  WHERE subscription.user_id = caller_id
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
    AND subscription_record.current_period_end IS NOT NULL
    AND subscription_record.current_period_end > now()
  THEN
    is_active := true;
    effective_plan := subscription_record.plan_code;
    effective_status := subscription_record.status;
    effective_source := 'stripe';
    effective_end := subscription_record.current_period_end;
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
    effective_end := subscription_record.current_period_end;
  END IF;

  RETURN jsonb_build_object(
    'is_active', is_active,
    'source', effective_source,
    'plan', effective_plan,
    'status', effective_status,
    'access_until', effective_end,
    'subscription', CASE
      WHEN subscription_record.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'plan', subscription_record.plan_code,
        'status', subscription_record.status,
        'amount_cents', subscription_record.amount_cents,
        'currency', subscription_record.currency,
        'billing_interval', subscription_record.billing_interval,
        'current_period_start', subscription_record.current_period_start,
        'current_period_end', subscription_record.current_period_end,
        'cancel_at_period_end', subscription_record.cancel_at_period_end,
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

REVOKE ALL ON FUNCTION public.get_stripe_billing_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_stripe_billing_overview() TO authenticated, service_role;

-- Keep the current onboarding alive during the migration and create the new
-- isolated trial grant for users who register after this migration.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, name, email, avatar_url, provider_type)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
      CASE
        WHEN NEW.raw_user_meta_data->>'iss' = 'https://accounts.google.com' THEN 'Google'
        WHEN NEW.raw_user_meta_data->>'provider_type' IS NOT NULL THEN NEW.raw_user_meta_data->>'provider_type'
        ELSE 'Email'
      END
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.user_subscriptions (
      user_id,
      plan,
      status,
      trial_started_at,
      trial_ends_at,
      subscription_started_at,
      subscription_ends_at
    )
    VALUES (
      NEW.id,
      'free_trial',
      'trial',
      now(),
      now() + interval '7 days',
      NULL,
      NULL
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in legacy onboarding for user %: % (SQLSTATE: %)',
      NEW.id, SQLERRM, SQLSTATE;
  END;

  BEGIN
    INSERT INTO public.billing_access_grants (
      user_id,
      source,
      plan_code,
      starts_at,
      ends_at,
      reason
    )
    VALUES (
      NEW.id,
      'trial',
      'free_trial',
      now(),
      now() + interval '7 days',
      'Teste gratuito inicial'
    )
    ON CONFLICT (user_id) WHERE source = 'trial' DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in Stripe billing onboarding for user %: % (SQLSTATE: %)',
      NEW.id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- Preserve valid local access while existing accounts move to the isolated
-- billing read model. There are no financial records copied from Asaas.
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
  'trial',
  'free_trial',
  COALESCE(subscription.trial_started_at, subscription.created_at, now()),
  subscription.trial_ends_at,
  'Teste gratuito migrado do acesso local'
FROM public.user_subscriptions AS subscription
WHERE subscription.trial_ends_at > now()
  AND subscription.status = 'trial'
ON CONFLICT (user_id) WHERE source = 'trial' DO NOTHING;

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
  CASE
    WHEN subscription.manual_access_plan IN ('monthly', 'annual')
      THEN subscription.manual_access_plan
    ELSE 'free_trial'
  END,
  COALESCE(subscription.manual_access_granted_at, subscription.updated_at, now()),
  subscription.manual_access_until,
  COALESCE(subscription.manual_access_reason, 'Acesso local migrado')
FROM public.user_subscriptions AS subscription
WHERE subscription.manual_access_until > now();
