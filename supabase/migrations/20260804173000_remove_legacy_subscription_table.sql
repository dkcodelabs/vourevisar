-- Final retirement of the provider-coupled subscription table. Access, trials
-- and commercial limits now come exclusively from the billing domain.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
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
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.billing_access_grants (
    user_id, source, plan_code, starts_at, ends_at, reason
  ) VALUES (
    NEW.id, 'trial', 'free_trial', now(), now() + interval '7 days', 'Teste gratuito inicial'
  ) ON CONFLICT (user_id) WHERE source = 'trial' DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_subscription_info(check_user_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_target_user_id uuid := COALESCE(check_user_id, auth.uid());
  v_caller_user_id uuid := auth.uid();
  v_caller_role text := auth.role();
  v_subscription public.billing_subscriptions%ROWTYPE;
  v_grant public.billing_access_grants%ROWTYPE;
  v_access_end timestamptz;
  v_plan text := 'free_trial';
  v_status text := 'expired';
  v_is_active boolean := false;
BEGIN
  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'user id is required' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(v_caller_role, '') <> 'service_role'
    AND (
      v_caller_user_id IS NULL
      OR (
        v_caller_user_id <> v_target_user_id
        AND NOT EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = v_caller_user_id AND role IN ('admin', 'owner')
        )
      )
    )
  THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT subscription.*
  INTO v_subscription
  FROM public.billing_subscriptions AS subscription
  WHERE subscription.user_id = v_target_user_id
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
    v_access_end := CASE
      WHEN v_subscription.cancel_at IS NOT NULL
        AND v_subscription.current_period_end IS NOT NULL
        THEN LEAST(v_subscription.cancel_at, v_subscription.current_period_end)
      ELSE COALESCE(v_subscription.cancel_at, v_subscription.current_period_end)
    END;
  END IF;

  SELECT access_grant.*
  INTO v_grant
  FROM public.billing_access_grants AS access_grant
  WHERE access_grant.user_id = v_target_user_id
    AND access_grant.revoked_at IS NULL
    AND access_grant.starts_at <= now()
    AND access_grant.ends_at > now()
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
    AND v_access_end IS NOT NULL
    AND v_access_end > now()
  THEN
    v_plan := v_subscription.plan_code;
    v_status := CASE WHEN v_subscription.status = 'trialing' THEN 'trial' ELSE 'active' END;
    v_is_active := true;
  ELSIF v_grant.id IS NOT NULL THEN
    v_plan := v_grant.plan_code;
    v_status := CASE WHEN v_grant.source = 'trial' THEN 'trial' ELSE 'active' END;
    v_access_end := v_grant.ends_at;
    v_is_active := true;
  END IF;

  RETURN json_build_object(
    'user_id', v_target_user_id,
    'plan', v_plan,
    'status', v_status,
    'is_active', v_is_active,
    'days_remaining', CASE
      WHEN v_is_active AND v_access_end IS NOT NULL
        THEN GREATEST(CEIL(EXTRACT(EPOCH FROM (v_access_end - now())) / 86400)::integer, 0)
      ELSE 0
    END,
    'trial_ends_at', CASE WHEN v_status = 'trial' THEN v_access_end ELSE NULL END,
    'subscription_ends_at', CASE WHEN v_plan IN ('monthly', 'annual') THEN v_access_end ELSE NULL END
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_subscription_info(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_subscription_info(uuid) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.has_active_subscription(uuid);

CREATE OR REPLACE FUNCTION public.admin_purge_user(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller_role text;
  v_target_email text;
BEGIN
  SELECT role INTO v_caller_role FROM public.user_roles WHERE user_id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Permissão negada.';
  END IF;

  SELECT email INTO v_target_email FROM auth.users WHERE id = p_target_user_id;
  IF v_target_email IN ('vourevisar@gmail.com', 'darciliok@gmail.com') THEN
    RAISE EXCEPTION 'Usuário protegido.';
  END IF;

  IF p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Auto-exclusão não permitida.';
  END IF;

  DELETE FROM public.cycle_study_logs WHERE user_id = p_target_user_id;
  DELETE FROM public.cycle_subject_states WHERE user_id = p_target_user_id;
  DELETE FROM public.cycle_rotations WHERE cycle_id IN (SELECT id FROM public.study_cycles_v2 WHERE user_id = p_target_user_id);
  DELETE FROM public.study_cycles_v2 WHERE user_id = p_target_user_id;
  DELETE FROM public.topic_review_history WHERE user_id = p_target_user_id;
  DELETE FROM public.topic_merges WHERE user_id = p_target_user_id;
  DELETE FROM public.question_attempts WHERE user_id = p_target_user_id;
  DELETE FROM public.topics WHERE subject_id IN (SELECT id FROM public.subjects WHERE user_id = p_target_user_id);
  DELETE FROM public.subject_merges WHERE user_id = p_target_user_id;
  DELETE FROM public.subject_relations WHERE user_id = p_target_user_id;
  DELETE FROM public.pending_merge_suggestions WHERE user_id = p_target_user_id;
  DELETE FROM public.subjects WHERE user_id = p_target_user_id;
  DELETE FROM public.pending_ai_extractions WHERE user_id = p_target_user_id;
  DELETE FROM public.edital_suggestions WHERE user_id = p_target_user_id;
  DELETE FROM public.pending_cycle_merges WHERE user_id = p_target_user_id;
  DELETE FROM public.user_editais WHERE user_id = p_target_user_id;
  DELETE FROM public.user_cycles WHERE user_id = p_target_user_id;
  DELETE FROM public.study_sessions WHERE user_id = p_target_user_id;
  DELETE FROM public.pomodoro_sessions WHERE user_id = p_target_user_id;
  DELETE FROM public.active_study_timers WHERE user_id = p_target_user_id;
  DELETE FROM public.user_study_analytics WHERE user_id = p_target_user_id;
  DELETE FROM public.general_notes WHERE user_id = p_target_user_id;
  DELETE FROM public.general_reminders WHERE user_id = p_target_user_id;
  DELETE FROM public.notifications WHERE user_id = p_target_user_id;
  DELETE FROM public.user_notifications WHERE user_id = p_target_user_id;
  DELETE FROM public.coupon_uses WHERE user_id = p_target_user_id;
  DELETE FROM public.payment_history WHERE user_id = p_target_user_id;
  DELETE FROM public.user_ai_quota_resets WHERE user_id = p_target_user_id;
  DELETE FROM public.user_events WHERE user_id = p_target_user_id;
  DELETE FROM public.api_usage WHERE user_id = p_target_user_id;
  DELETE FROM public.comments WHERE author_id = p_target_user_id;
  DELETE FROM public.posts WHERE author_id = p_target_user_id;
  DELETE FROM public.admin_error_events WHERE target_user_id = p_target_user_id;
  DELETE FROM public.user_feedback_events WHERE actor_user_id = p_target_user_id;
  DELETE FROM public.user_settings WHERE user_id = p_target_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_target_user_id;
  DELETE FROM public.organization_members WHERE user_id = p_target_user_id;

  INSERT INTO public.audit_logs (user_id, action, table_name, changes)
  VALUES (auth.uid(), 'admin_purge_user', 'auth.users', jsonb_build_object(
    'purged_user_id', p_target_user_id,
    'purged_email', v_target_email,
    'purged_at', now()
  ));

  DELETE FROM public.audit_logs WHERE user_id = p_target_user_id;
  DELETE FROM public.profiles WHERE id = p_target_user_id;
  DELETE FROM auth.users WHERE id = p_target_user_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_purge_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_purge_user(uuid) TO authenticated;

-- This table belongs to the same retired provider flow. Stripe invoices are
-- read from Stripe through the authenticated billing boundary instead.
DROP TABLE public.payment_history;
DROP TABLE public.user_subscriptions;
