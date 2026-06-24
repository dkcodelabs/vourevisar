-- Define SaaS entitlement rules:
-- - New users receive a 7-day trial automatically.
-- - Trial users get 1 lifetime AI edital extraction.
-- - Monthly subscribers get 5 AI edital extractions per month.
-- - Annual subscribers get 10 AI edital extractions per month.
-- - Expired/canceled users can sign in, but cannot use core app routes or AI extraction.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'auth'
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
      NOW(),
      NOW() + INTERVAL '7 days',
      NULL,
      NULL
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for user %: % (SQLSTATE: %)',
      NEW.id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$function$;
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
          SELECT 1
          FROM public.user_roles
          WHERE user_id = v_caller_id
            AND role IN ('admin', 'owner')
        )
      )
    )
  THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = p_user_id
    AND role IN ('admin', 'owner')
  LIMIT 1;

  IF v_role IS NOT NULL THEN
    SELECT COUNT(*)::integer INTO v_usage
    FROM public.user_editais
    WHERE user_id = p_user_id
      AND is_imported = true
      AND source_id IS NULL
      AND created_at >= DATE_TRUNC('month', NOW());

    RETURN json_build_object(
      'plan', 'admin',
      'status', 'active',
      'effective_plan', 'admin',
      'effective_status', 'active',
      'limit', -1,
      'usage', v_usage,
      'remaining', null,
      'usage_period', 'monthly',
      'has_bypass', true,
      'can_import', true
    );
  END IF;

  SELECT plan, status, trial_ends_at, subscription_ends_at
  INTO v_plan, v_status, v_trial_ends_at, v_subscription_ends_at
  FROM public.user_subscriptions
  WHERE user_id = p_user_id;

  IF FOUND THEN
    v_effective_plan := COALESCE(v_plan, 'free_trial');

    IF v_plan IN ('monthly', 'annual')
      AND v_status = 'active'
      AND (v_subscription_ends_at IS NULL OR v_subscription_ends_at > NOW())
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
      AND is_imported = true
      AND source_id IS NULL
      AND created_at >= DATE_TRUNC('month', NOW());
  ELSE
    SELECT COUNT(*)::integer INTO v_usage
    FROM public.user_editais
    WHERE user_id = p_user_id
      AND is_imported = true
      AND source_id IS NULL;
  END IF;

  v_remaining := GREATEST(v_limit - v_usage, 0);
  v_can_import := v_usage < v_limit;

  RETURN json_build_object(
    'plan', v_effective_plan,
    'status', v_effective_status,
    'limit', v_limit,
    'usage', v_usage,
    'remaining', v_remaining,
    'usage_period', v_usage_period,
    'has_bypass', v_has_bypass,
    'can_import', v_can_import
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_user_ai_limits(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_ai_limits(uuid) TO authenticated, service_role;
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
    ELSIF subscription_record.status = 'active'
      AND subscription_record.plan IN ('monthly', 'annual')
      AND (subscription_record.subscription_ends_at IS NULL OR subscription_record.subscription_ends_at > NOW())
    THEN
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
UPDATE public.plan_configs
SET
  description = 'Acesso completo sem fidelidade, cancele quando quiser.',
  features = '["Acesso completo ao app", "5 extrações com IA por mês", "Catálogo e criação manual sem limite", "Suporte prioritário"]'::jsonb,
  updated_at = NOW()
WHERE slug = 'monthly';
UPDATE public.plan_configs
SET
  description = 'Acesso completo por 12 meses, mais economia e mais créditos de IA.',
  features = '["Tudo do plano mensal", "10 extrações com IA por mês", "2 meses de economia", "Prioridade em melhorias e suporte"]'::jsonb,
  badge = 'Melhor custo-benefício',
  updated_at = NOW()
WHERE slug = 'annual';
