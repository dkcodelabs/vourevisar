CREATE OR REPLACE FUNCTION public.log_user_event(
    p_event_type text,
    p_target_user_id uuid DEFAULT NULL::uuid,
    p_actor_user_id uuid DEFAULT NULL::uuid,
    p_origin text DEFAULT 'web_app'::text,
    p_metadata jsonb DEFAULT '{}'::jsonb,
    p_status text DEFAULT 'SUCCESS'::text
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
    v_dedupe_key text;
    v_existing_log_id bigint;
    v_session_fingerprint text;
    v_final_origin text;
    v_final_metadata jsonb;
BEGIN
    v_final_metadata := COALESCE(p_metadata, '{}'::jsonb);

    -- Normalização de p_origin (mapeia internamente para a coluna source)
    IF p_origin NOT IN ('web_app', 'mobile_app', 'system') THEN
        IF p_origin IS NOT NULL AND p_origin <> '' THEN
            v_final_metadata := jsonb_set(v_final_metadata, '{source_detail}', to_jsonb(p_origin), true);
        END IF;
        v_final_origin := 'web_app';
    ELSE
        v_final_origin := p_origin;
    END IF;

    -- Contexto de usuário
    v_auth_user_id := auth.uid();
    v_actor_id := COALESCE(p_actor_user_id, v_auth_user_id, p_target_user_id);
    v_target_id := COALESCE(p_target_user_id, v_auth_user_id, p_actor_user_id);
    v_user_id_insert := COALESCE(v_target_id, v_actor_id);

    IF v_user_id_insert IS NULL THEN
        RETURN json_build_object('status','error','reason','missing_user_context');
    END IF;

    v_request_id := v_final_metadata->>'request_id';
    
    -- LOGIN_SUCCESS dedupe
    IF p_event_type = 'LOGIN_SUCCESS' AND v_request_id IS NOT NULL THEN
        SELECT id INTO v_existing_log_id
        FROM public.user_events
        WHERE event_type = 'LOGIN_SUCCESS'
          AND metadata->>'request_id' = v_request_id
        LIMIT 1;

        IF v_existing_log_id IS NOT NULL THEN
            RETURN json_build_object('status','skipped','reason','duplicate_request_id','origin',v_final_origin,'log_id',v_existing_log_id);
        END IF;
    END IF;

    -- INSERT usando a nova coluna 'source'
    INSERT INTO public.user_events (
        user_id, target_user_id, actor_user_id, event_type, source, metadata, status, occurred_at
    ) VALUES (
        v_user_id_insert, v_target_id, v_actor_id, p_event_type, v_final_origin, v_final_metadata, p_status, now()
    )
    RETURNING id INTO v_existing_log_id;

    RETURN json_build_object('status','logged','log_id',v_existing_log_id,'origin',v_final_origin);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('status','error','message',SQLERRM);
END;
$function$
;;
