-- Removes variables identified by `supabase db lint` without changing RPC contracts.

CREATE OR REPLACE FUNCTION public.test_difficulty_system()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  test_result text := '';
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'topics' AND column_name = 'difficulty_level';

  IF col_type = 'integer' THEN
    test_result := test_result || '✅ Coluna difficulty_level é INTEGER' || E'\n';
  ELSE
    test_result := test_result || '❌ Coluna difficulty_level não é INTEGER (tipo: ' || COALESCE(col_type, 'não encontrada') || ')' || E'\n';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'topics' AND column_name = 'difficulty_set_at') THEN
    test_result := test_result || '✅ Coluna difficulty_set_at criada' || E'\n';
  ELSE
    test_result := test_result || '❌ Coluna difficulty_set_at não encontrada' || E'\n';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_estimated_time_by_difficulty') THEN
    test_result := test_result || '✅ Função get_estimated_time_by_difficulty criada' || E'\n';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_points_by_difficulty') THEN
    test_result := test_result || '✅ Função get_points_by_difficulty criada' || E'\n';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_difficulty_stats') THEN
    test_result := test_result || '✅ Função get_user_difficulty_stats criada' || E'\n';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'suggest_topics_by_time') THEN
    test_result := test_result || '✅ Função suggest_topics_by_time criada' || E'\n';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'calculate_difficulty_points') THEN
    test_result := test_result || '✅ Função calculate_difficulty_points criada' || E'\n';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'user_difficulty_overview') THEN
    test_result := test_result || '✅ View user_difficulty_overview criada' || E'\n';
  END IF;

  BEGIN
    SELECT get_estimated_time_by_difficulty(3) INTO STRICT col_type;
    test_result := test_result || '✅ Função de tempo funciona (3 estrelas = ' || col_type || ' min)' || E'\n';
  EXCEPTION WHEN OTHERS THEN
    test_result := test_result || '❌ Erro ao testar função de tempo' || E'\n';
  END;

  RETURN test_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_user_event(
  p_event_type text,
  p_target_user_id uuid DEFAULT NULL,
  p_actor_user_id uuid DEFAULT NULL,
  p_origin text DEFAULT 'web_app',
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_status text DEFAULT 'SUCCESS'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_auth_user_id uuid;
  v_target_id uuid;
  v_actor_id uuid;
  v_user_id_insert uuid;
  v_request_id text;
  v_existing_log_id bigint;
  v_final_origin text;
  v_final_metadata jsonb;
BEGIN
  v_final_metadata := COALESCE(p_metadata, '{}'::jsonb);

  IF p_origin NOT IN ('web_app', 'mobile_app', 'system') THEN
    IF p_origin IS NOT NULL AND p_origin <> '' THEN
      v_final_metadata := jsonb_set(v_final_metadata, '{source_detail}', to_jsonb(p_origin), true);
    END IF;
    v_final_origin := 'web_app';
  ELSE
    v_final_origin := p_origin;
  END IF;

  v_auth_user_id := auth.uid();
  v_actor_id := COALESCE(p_actor_user_id, v_auth_user_id, p_target_user_id);
  v_target_id := COALESCE(p_target_user_id, v_auth_user_id, p_actor_user_id);
  v_user_id_insert := COALESCE(v_target_id, v_actor_id);

  IF v_user_id_insert IS NULL THEN
    RETURN json_build_object('status', 'error', 'reason', 'missing_user_context');
  END IF;

  v_request_id := v_final_metadata->>'request_id';
  IF p_event_type = 'LOGIN_SUCCESS' AND v_request_id IS NOT NULL THEN
    SELECT id INTO v_existing_log_id
    FROM public.user_events
    WHERE event_type = 'LOGIN_SUCCESS'
      AND metadata->>'request_id' = v_request_id
    LIMIT 1;

    IF v_existing_log_id IS NOT NULL THEN
      RETURN json_build_object('status', 'skipped', 'reason', 'duplicate_request_id', 'origin', v_final_origin, 'log_id', v_existing_log_id);
    END IF;
  END IF;

  INSERT INTO public.user_events (
    user_id, target_user_id, actor_user_id, event_type, source, metadata, status, occurred_at
  ) VALUES (
    v_user_id_insert, v_target_id, v_actor_id, p_event_type, v_final_origin, v_final_metadata, p_status, now()
  )
  RETURNING id INTO v_existing_log_id;

  RETURN json_build_object('status', 'logged', 'log_id', v_existing_log_id, 'origin', v_final_origin);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('status', 'error', 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_daily_progress(p_user_id uuid, p_subject_id text)
RETURNS boolean
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  current_studied text[];
  is_new_subject boolean := false;
BEGIN
  SELECT materias_estudadas_hoje INTO current_studied
  FROM user_cycles
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN RETURN false; END IF;
  IF NOT (p_subject_id = ANY(current_studied)) THEN
    current_studied := array_append(current_studied, p_subject_id);
    is_new_subject := true;
    UPDATE user_cycles SET materias_estudadas_hoje = current_studied, atualizado_em = now() WHERE user_id = p_user_id;
  END IF;
  RETURN is_new_subject;
END;
$function$;
