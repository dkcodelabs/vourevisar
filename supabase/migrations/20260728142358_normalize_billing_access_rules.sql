ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS asaas_payment_id text,
  ADD COLUMN IF NOT EXISTS manual_access_until timestamptz,
  ADD COLUMN IF NOT EXISTS manual_access_plan public.subscription_plan,
  ADD COLUMN IF NOT EXISTS manual_access_reason text,
  ADD COLUMN IF NOT EXISTS manual_access_granted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_asaas_payment_id
  ON public.user_subscriptions (asaas_payment_id)
  WHERE asaas_payment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_subscription_info(check_user_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid := COALESCE(check_user_id, auth.uid());
  caller_user_id uuid := auth.uid();
  caller_role text := auth.role();
  record_value record;
  effective_plan text := 'free_trial';
  effective_status text := 'expired';
  effective_end timestamptz := NULL;
  is_active boolean := false;
  days_remaining integer := 0;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'user id is required' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(caller_role, '') <> 'service_role'
    AND (
      caller_user_id IS NULL OR caller_user_id <> target_user_id
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = caller_user_id AND role IN ('admin', 'owner')
      )
    )
  THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO record_value FROM public.user_subscriptions
  WHERE user_id = target_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'user_id', target_user_id, 'plan', 'free_trial', 'status', 'expired',
      'is_active', false, 'days_remaining', 0, 'created_at', now(), 'updated_at', now()
    );
  END IF;

  IF record_value.manual_access_until IS NOT NULL
    AND record_value.manual_access_until > now()
  THEN
    effective_plan := COALESCE(record_value.manual_access_plan::text, 'free_trial');
    effective_status := CASE WHEN effective_plan = 'free_trial' THEN 'trial' ELSE 'active' END;
    effective_end := record_value.manual_access_until;
    is_active := true;
  END IF;

  IF record_value.status = 'trial'
    AND record_value.trial_ends_at IS NOT NULL
    AND record_value.trial_ends_at > now()
    AND (effective_end IS NULL OR record_value.trial_ends_at > effective_end)
  THEN
    effective_plan := 'free_trial'; effective_status := 'trial';
    effective_end := record_value.trial_ends_at; is_active := true;
  END IF;

  IF record_value.status IN ('active', 'canceled')
    AND record_value.plan IN ('monthly', 'annual')
    AND (COALESCE(record_value.subscription_ends_at, record_value.next_billing_date) IS NULL
      OR COALESCE(record_value.subscription_ends_at, record_value.next_billing_date) > now())
    AND (effective_end IS NULL OR COALESCE(record_value.subscription_ends_at, record_value.next_billing_date) > effective_end)
  THEN
    effective_plan := record_value.plan::text; effective_status := 'active';
    effective_end := COALESCE(record_value.subscription_ends_at, record_value.next_billing_date); is_active := true;
  END IF;

  IF is_active AND effective_end IS NOT NULL THEN
    days_remaining := GREATEST(CEIL(EXTRACT(EPOCH FROM (effective_end - now())) / 86400)::integer, 0);
  END IF;

  RETURN json_build_object(
    'user_id', target_user_id,
    'plan', effective_plan,
    'status', effective_status,
    'is_active', is_active,
    'days_remaining', days_remaining,
    'trial_started_at', record_value.trial_started_at,
    'trial_ends_at', record_value.trial_ends_at,
    'subscription_started_at', CASE WHEN effective_plan IN ('monthly', 'annual') THEN record_value.subscription_started_at ELSE NULL END,
    'subscription_ends_at', CASE WHEN effective_plan IN ('monthly', 'annual') THEN effective_end ELSE NULL END,
    'manual_access_until', record_value.manual_access_until,
    'manual_access_plan', record_value.manual_access_plan,
    'manual_access_reason', record_value.manual_access_reason,
    'manual_access_granted_at', record_value.manual_access_granted_at,
    'created_at', record_value.created_at,
    'updated_at', record_value.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_subscription_info(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_subscription_info(uuid) TO authenticated, service_role;
