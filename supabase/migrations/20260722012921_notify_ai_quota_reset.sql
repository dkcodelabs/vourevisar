CREATE OR REPLACE FUNCTION public.reset_user_ai_quota(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  SELECT plan INTO v_plan
  FROM public.user_subscriptions
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'subscription not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT public.get_user_ai_limits(p_user_id) INTO v_limits;
  v_limit := COALESCE((v_limits ->> 'limit')::integer, 0);

  IF v_limit <= 0 THEN
    RAISE EXCEPTION 'user has no active AI quota' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.user_subscriptions
  SET ai_quota_reset_at = v_reset_at
  WHERE user_id = p_user_id;

  v_message := CASE
    WHEN v_plan = 'free_trial' THEN
      'A administração liberou 1 nova importação com IA como crédito de cortesia.'
    ELSE
      format('A administração liberou novamente sua cota de IA. Você pode fazer até %s importações neste período.', v_limit)
  END;

  INSERT INTO public.user_notifications (
    user_id,
    type,
    category,
    title,
    message,
    action_url,
    read,
    data
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
