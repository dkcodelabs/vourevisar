ALTER TABLE public.user_editais
  ADD COLUMN IF NOT EXISTS ai_extraction_used boolean NOT NULL DEFAULT false;

-- Before this field existed, an imported edital without a catalog source was
-- the only unambiguous representation of an IA extraction.
UPDATE public.user_editais
SET ai_extraction_used = true
WHERE is_imported = true
  AND source_id IS NULL
  AND ai_extraction_used = false;

COMMENT ON COLUMN public.user_editais.ai_extraction_used IS
  'true when the edital was created from an IA extraction and consumed an IA quota unit.';

CREATE OR REPLACE FUNCTION public.get_user_ai_limits(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text := auth.role();
  v_role text;
  v_plan text;
  v_status text;
  v_trial_ends_at timestamptz;
  v_subscription_ends_at timestamptz;
  v_next_billing_date timestamptz;
  v_effective_plan text := 'free_trial';
  v_effective_status text := 'expired';
  v_limit integer := 0;
  v_usage integer := 0;
  v_remaining integer := 0;
  v_usage_period text := 'lifetime';
  v_has_bypass boolean := false;
  v_can_import boolean := false;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(v_caller_role, '') <> 'service_role'
    AND (
      v_caller_id IS NULL
      OR (
        v_caller_id <> p_user_id
        AND NOT EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = v_caller_id AND role IN ('admin', 'owner')
        )
      )
    )
  THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = p_user_id AND role IN ('admin', 'owner')
  LIMIT 1;

  IF v_role IS NOT NULL THEN
    SELECT COUNT(*)::integer INTO v_usage
    FROM public.user_editais
    WHERE user_id = p_user_id
      AND ai_extraction_used = true
      AND created_at >= DATE_TRUNC('month', NOW());

    RETURN json_build_object(
      'plan', 'admin', 'status', 'active', 'effective_plan', 'admin',
      'effective_status', 'active', 'limit', -1, 'usage', v_usage,
      'remaining', null, 'usage_period', 'monthly', 'has_bypass', true,
      'can_import', true
    );
  END IF;

  SELECT plan, status, trial_ends_at, subscription_ends_at, next_billing_date
  INTO v_plan, v_status, v_trial_ends_at, v_subscription_ends_at, v_next_billing_date
  FROM public.user_subscriptions
  WHERE user_id = p_user_id;

  IF FOUND THEN
    v_effective_plan := COALESCE(v_plan, 'free_trial');

    IF v_plan IN ('monthly', 'annual')
      AND v_status = 'active'
      AND (v_subscription_ends_at IS NULL OR v_subscription_ends_at > NOW())
      AND (v_next_billing_date IS NULL OR v_next_billing_date > NOW())
    THEN
      v_effective_status := 'active';
      v_usage_period := 'monthly';
      v_limit := CASE WHEN v_plan = 'annual' THEN 10 ELSE 5 END;
    ELSIF v_plan = 'free_trial'
      AND v_status = 'trial'
      AND v_trial_ends_at IS NOT NULL
      AND v_trial_ends_at > NOW()
    THEN
      v_effective_status := 'trial';
      v_usage_period := 'lifetime';
      v_limit := 1;
    ELSE
      v_effective_plan := 'free_trial';
      v_effective_status := 'expired';
      v_usage_period := 'lifetime';
      v_limit := 0;
    END IF;
  END IF;

  IF v_usage_period = 'monthly' THEN
    SELECT COUNT(*)::integer INTO v_usage
    FROM public.user_editais
    WHERE user_id = p_user_id
      AND ai_extraction_used = true
      AND created_at >= DATE_TRUNC('month', NOW());
  ELSE
    SELECT COUNT(*)::integer INTO v_usage
    FROM public.user_editais
    WHERE user_id = p_user_id
      AND ai_extraction_used = true;
  END IF;

  v_remaining := GREATEST(v_limit - v_usage, 0);
  v_can_import := v_usage < v_limit;

  RETURN json_build_object(
    'plan', v_effective_plan, 'status', v_effective_status,
    'limit', v_limit, 'usage', v_usage, 'remaining', v_remaining,
    'usage_period', v_usage_period, 'has_bypass', v_has_bypass,
    'can_import', v_can_import
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_ai_limits(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_ai_limits(uuid) TO authenticated, service_role;
