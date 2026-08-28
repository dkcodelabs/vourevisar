-- AI quota is an entitlement derived from the canonical billing domain, not a
-- property of the retired subscription provider record.

CREATE TABLE IF NOT EXISTS public.user_ai_quota_resets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reset_at timestamptz NOT NULL,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_ai_quota_resets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_ai_quota_resets FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.user_ai_quota_resets TO service_role;

-- Preserve an already granted courtesy reset before the legacy table is retired.
INSERT INTO public.user_ai_quota_resets (user_id, reset_at)
SELECT user_id, ai_quota_reset_at
FROM public.user_subscriptions
WHERE ai_quota_reset_at IS NOT NULL
ON CONFLICT (user_id) DO UPDATE
SET reset_at = GREATEST(
  public.user_ai_quota_resets.reset_at,
  EXCLUDED.reset_at
);

CREATE OR REPLACE FUNCTION public.get_user_ai_limits(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text := auth.role();
  v_role text;
  v_subscription public.billing_subscriptions%ROWTYPE;
  v_grant public.billing_access_grants%ROWTYPE;
  v_subscription_end timestamptz;
  v_plan text := 'free_trial';
  v_status text := 'expired';
  v_limit integer := 0;
  v_usage integer := 0;
  v_remaining integer := 0;
  v_usage_period text := 'lifetime';
  v_has_bypass boolean := false;
  v_reset_at timestamptz;
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
          SELECT 1
          FROM public.user_roles
          WHERE user_id = v_caller_id AND role IN ('admin', 'owner')
        )
      )
    )
  THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT role
  INTO v_role
  FROM public.user_roles
  WHERE user_id = p_user_id AND role IN ('admin', 'owner')
  LIMIT 1;

  IF v_role IS NOT NULL THEN
    SELECT COUNT(*)::integer
    INTO v_usage
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

  SELECT subscription.*
  INTO v_subscription
  FROM public.billing_subscriptions AS subscription
  WHERE subscription.user_id = p_user_id
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

  IF v_subscription.id IS NOT NULL THEN
    v_subscription_end := CASE
      WHEN v_subscription.cancel_at IS NOT NULL
        AND v_subscription.current_period_end IS NOT NULL
        THEN LEAST(v_subscription.cancel_at, v_subscription.current_period_end)
      ELSE COALESCE(v_subscription.cancel_at, v_subscription.current_period_end)
    END;
  END IF;

  SELECT access_grant.*
  INTO v_grant
  FROM public.billing_access_grants AS access_grant
  WHERE access_grant.user_id = p_user_id
    AND access_grant.revoked_at IS NULL
    AND access_grant.starts_at <= NOW()
    AND access_grant.ends_at > NOW()
  ORDER BY
    CASE access_grant.source
      WHEN 'manual' THEN 1
      WHEN 'goodwill' THEN 2
      WHEN 'trial' THEN 3
      ELSE 4
    END,
    access_grant.ends_at DESC
  LIMIT 1;

  IF v_subscription.id IS NOT NULL
    AND v_subscription.status IN ('active', 'trialing', 'past_due')
    AND v_subscription.access_suspended_at IS NULL
    AND v_subscription_end IS NOT NULL
    AND v_subscription_end > NOW()
  THEN
    v_plan := v_subscription.plan_code;
    v_status := 'active';
  ELSIF v_grant.id IS NOT NULL THEN
    v_plan := v_grant.plan_code;
    v_status := CASE WHEN v_grant.source = 'trial' THEN 'trial' ELSE 'active' END;
  END IF;

  IF v_plan IN ('monthly', 'annual') AND v_status = 'active' THEN
    v_usage_period := 'monthly';
    v_limit := CASE WHEN v_plan = 'annual' THEN 10 ELSE 5 END;
  ELSIF v_plan = 'free_trial' AND v_status = 'trial' THEN
    v_limit := 1;
  ELSE
    v_plan := 'free_trial';
    v_status := 'expired';
  END IF;

  SELECT reset_at
  INTO v_reset_at
  FROM public.user_ai_quota_resets
  WHERE user_id = p_user_id;

  IF v_usage_period = 'monthly' THEN
    SELECT COUNT(*)::integer
    INTO v_usage
    FROM public.user_editais
    WHERE user_id = p_user_id
      AND ai_extraction_used = true
      AND created_at >= GREATEST(
        DATE_TRUNC('month', NOW()),
        COALESCE(v_reset_at, '-infinity'::timestamptz)
      );
  ELSE
    SELECT COUNT(*)::integer
    INTO v_usage
    FROM public.user_editais
    WHERE user_id = p_user_id
      AND ai_extraction_used = true
      AND created_at >= COALESCE(v_reset_at, '-infinity'::timestamptz);
  END IF;

  v_remaining := GREATEST(v_limit - v_usage, 0);

  RETURN json_build_object(
    'plan', v_plan, 'status', v_status,
    'limit', v_limit, 'usage', v_usage, 'remaining', v_remaining,
    'usage_period', v_usage_period, 'has_bypass', v_has_bypass,
    'can_import', v_usage < v_limit
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_ai_limits(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_ai_limits(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reset_user_ai_quota(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_reset_at timestamptz := NOW();
  v_limits json;
  v_limit integer;
  v_plan text;
  v_message text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required' USING ERRCODE = '22023';
  END IF;

  SELECT public.get_user_ai_limits(p_user_id)
  INTO v_limits;
  v_limit := COALESCE((v_limits ->> 'limit')::integer, 0);
  v_plan := COALESCE(v_limits ->> 'plan', 'free_trial');

  IF v_limit <= 0 THEN
    RAISE EXCEPTION 'user has no active AI quota' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.user_ai_quota_resets (user_id, reset_at, granted_by)
  VALUES (p_user_id, v_reset_at, auth.uid())
  ON CONFLICT (user_id) DO UPDATE
  SET reset_at = EXCLUDED.reset_at,
      granted_by = EXCLUDED.granted_by,
      updated_at = NOW();

  v_message := CASE
    WHEN v_plan = 'free_trial' THEN
      'A administração liberou 1 nova importação com IA como crédito de cortesia.'
    ELSE
      format('A administração liberou novamente sua cota de IA. Você pode fazer até %s importações neste período.', v_limit)
  END;

  INSERT INTO public.user_notifications (
    user_id, type, category, title, message, action_url, read, data
  ) VALUES (
    p_user_id,
    'success',
    'sistema',
    'Cota de IA liberada',
    v_message,
    '/meus-editais',
    false,
    jsonb_build_object('source', 'admin_ai_quota_reset', 'reset_at', v_reset_at)
  );

  RETURN json_build_object(
    'user_id', p_user_id,
    'reset_at', v_reset_at,
    'limit', v_limit,
    'plan', v_plan,
    'notified', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reset_user_ai_quota(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_user_ai_quota(uuid) TO service_role;
