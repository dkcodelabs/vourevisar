CREATE OR REPLACE FUNCTION public.get_subscription_info(check_user_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
  caller_user_id uuid := auth.uid();
  caller_role text := auth.role();
  subscription_record record;
  effective_plan text := 'free_trial';
  effective_status text := 'expired';
  is_active boolean := false;
  days_remaining integer := 0;
  end_date timestamptz;
BEGIN
  target_user_id := COALESCE(check_user_id, auth.uid());

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'user id is required' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(caller_role, '') <> 'service_role'
    AND (
      caller_user_id IS NULL
      OR (
        caller_user_id <> target_user_id
        AND NOT EXISTS (
          SELECT 1
          FROM public.user_roles
          WHERE user_id = caller_user_id
            AND role IN ('admin', 'owner')
        )
      )
    )
  THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT
    user_id,
    plan,
    status,
    trial_started_at,
    trial_ends_at,
    subscription_started_at,
    subscription_ends_at,
    created_at,
    updated_at
  INTO subscription_record
  FROM public.user_subscriptions
  WHERE user_id = target_user_id;

  IF FOUND THEN
    IF subscription_record.status = 'trial'
      AND subscription_record.trial_ends_at IS NOT NULL
      AND subscription_record.trial_ends_at > NOW()
    THEN
      effective_plan := 'free_trial';
      effective_status := 'trial';
      end_date := subscription_record.trial_ends_at;
      is_active := true;
    ELSIF subscription_record.status IN ('active', 'canceled')
      AND subscription_record.plan IN ('monthly', 'annual')
      AND (subscription_record.subscription_ends_at IS NULL OR subscription_record.subscription_ends_at > NOW())
    THEN
      -- Cancelar a renovação encerra a cobrança futura, não o período já pago.
      effective_plan := subscription_record.plan;
      effective_status := 'active';
      end_date := subscription_record.subscription_ends_at;
      is_active := true;
    ELSE
      effective_plan := 'free_trial';
      effective_status := 'expired';
      is_active := false;
    END IF;
  END IF;

  IF end_date IS NOT NULL AND end_date > NOW() THEN
    days_remaining := GREATEST(CEIL(EXTRACT(EPOCH FROM (end_date - NOW())) / 86400)::integer, 0);
  END IF;

  RETURN json_build_object(
    'user_id', target_user_id,
    'plan', effective_plan,
    'status', effective_status,
    'is_active', is_active,
    'days_remaining', days_remaining,
    'trial_started_at', CASE WHEN FOUND THEN subscription_record.trial_started_at ELSE null END,
    'trial_ends_at', CASE WHEN FOUND THEN subscription_record.trial_ends_at ELSE null END,
    'subscription_started_at', CASE WHEN is_active AND effective_plan IN ('monthly', 'annual') THEN subscription_record.subscription_started_at ELSE null END,
    'subscription_ends_at', CASE WHEN is_active AND effective_plan IN ('monthly', 'annual') THEN subscription_record.subscription_ends_at ELSE null END,
    'created_at', CASE WHEN FOUND THEN subscription_record.created_at ELSE NOW() END,
    'updated_at', CASE WHEN FOUND THEN subscription_record.updated_at ELSE NOW() END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_subscription_info(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_subscription_info(uuid) TO authenticated, service_role;
