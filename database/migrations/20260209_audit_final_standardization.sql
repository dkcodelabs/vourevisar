-- 1. BACKFILL: Padronizar 'source' (origin) e mover detalhes técnicos para metadata
-- Transforma valores técnicos antigos (ex: 'signOut_handler_v2') em 'web_app'
-- e preserva o valor original em metadata->>'source'.

DO $$
BEGIN
    -- Apenas se source não for um dos padrões aceitos
    UPDATE public.user_events
    SET 
        metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{source}', to_jsonb(source)),
        source = 'web_app'
    WHERE source IS NOT NULL 
      AND source NOT IN ('web_app', 'mobile_app', 'system');

    -- Corrigir nulos para 'web_app'
    UPDATE public.user_events
    SET source = 'web_app'
    WHERE source IS NULL;
END $$;

-- 2. ATUALIZAR RPC: Impor padrões e fallback
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
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_target_id uuid;
    v_actor_id uuid;
    v_request_id text;
    v_dedupe_key text;
    v_existing_log_id bigint;
    v_session_fingerprint text;
    
    -- Variáveis normalizadas
    v_final_origin text;
    v_final_metadata jsonb;
BEGIN
    -- Normalizar Origin e Metadata
    v_final_metadata := p_metadata;
    
    IF p_origin NOT IN ('web_app', 'mobile_app', 'system') THEN
        -- Se origin for técnico (ex: 'signOut_handler_v2'), move para metadata
        IF p_origin IS NOT NULL AND p_origin <> '' THEN
             v_final_metadata := jsonb_set(v_final_metadata, '{source}', to_jsonb(p_origin));
        END IF;
        v_final_origin := 'web_app'; -- Fallback seguro
    ELSE
        v_final_origin := p_origin;
    END IF;

    -- Determine Actor
    v_user_id := auth.uid();
    v_actor_id := COALESCE(p_actor_user_id, v_user_id);
    v_target_id := COALESCE(p_target_user_id, v_user_id);
    
    -- Extract metadata fields
    v_request_id := v_final_metadata->>'request_id';
    v_dedupe_key := v_final_metadata->>'dedupe_key';
    v_session_fingerprint := v_final_metadata->>'session_fingerprint';

    -- === RULE 1: LOGIN_SUCCESS Idempotency ===
    IF p_event_type = 'LOGIN_SUCCESS' THEN
        -- A. Primary: Check explicit Request ID
        IF v_request_id IS NOT NULL THEN
            SELECT id INTO v_existing_log_id FROM public.user_events 
            WHERE metadata->>'request_id' = v_request_id LIMIT 1;
            
            IF v_existing_log_id IS NOT NULL THEN
                RETURN json_build_object('status', 'skipped', 'reason', 'duplicate_request_id');
            END IF;
        END IF;
        
        -- B. Fallback: Actor + Fingerprint within 2 minutes (prevent double logging on unstable connections)
        IF v_session_fingerprint IS NOT NULL THEN
             SELECT id INTO v_existing_log_id FROM public.user_events 
             WHERE actor_user_id = v_actor_id 
               AND event_type = 'LOGIN_SUCCESS'
               AND metadata->>'session_fingerprint' = v_session_fingerprint
               AND occurred_at > (now() - interval '2 minutes')
             LIMIT 1;

             IF v_existing_log_id IS NOT NULL THEN
                RETURN json_build_object('status', 'skipped', 'reason', 'duplicate_login_window');
            END IF;
        END IF;
    END IF;

    -- === RULE 2: LOGOUT Debounce ===
    -- Dedupe Logout for same user within 5 seconds (rapid clicks)
    IF p_event_type = 'LOGOUT' AND v_actor_id IS NOT NULL THEN
        SELECT id INTO v_existing_log_id FROM public.user_events 
        WHERE actor_user_id = v_actor_id 
          AND event_type = 'LOGOUT'
          AND occurred_at > (now() - interval '5 seconds')
        LIMIT 1;
        
        IF v_existing_log_id IS NOT NULL THEN
            RETURN json_build_object('status', 'skipped', 'reason', 'logout_debounce');
        END IF;
    END IF;

    -- === RULE 3: SESSION_START Throttling ===
    -- Throttle 30 mins per actor
    IF p_event_type = 'SESSION_START' AND v_actor_id IS NOT NULL THEN
        -- Check duplicate key if provided (frontend bucket)
        IF v_dedupe_key IS NOT NULL THEN
             SELECT id INTO v_existing_log_id FROM public.user_events 
             WHERE metadata->>'dedupe_key' = v_dedupe_key LIMIT 1;
             
             IF v_existing_log_id IS NOT NULL THEN
                RETURN json_build_object('status', 'skipped', 'reason', 'duplicate_session_key');
            END IF;
        END IF;

        -- Check time window fallback
        SELECT id INTO v_existing_log_id
        FROM public.user_events
        WHERE actor_user_id = v_actor_id
          AND event_type = 'SESSION_START'
          AND occurred_at > (now() - interval '30 minutes')
        LIMIT 1;

        IF v_existing_log_id IS NOT NULL THEN
            RETURN json_build_object('status', 'skipped', 'reason', 'throttled', 'log_id', v_existing_log_id);
        END IF;
    END IF;

    -- INSERT
    BEGIN
        INSERT INTO public.user_events (
            user_id,
            target_user_id,
            actor_user_id,
            event_type,
            source,
            metadata,
            status,
            occurred_at
        ) VALUES (
            v_target_id, -- user_id target
            v_target_id,
            v_actor_id,
            p_event_type,
            v_final_origin, -- source column normalized
            v_final_metadata,
            p_status,
            now()
        ) RETURNING id INTO v_existing_log_id;
        
        RETURN json_build_object('status', 'logged', 'log_id', v_existing_log_id);
    EXCEPTION 
        WHEN unique_violation THEN
            -- Caught by partial index
            RETURN json_build_object('status', 'skipped', 'reason', 'unique_violation');
        WHEN OTHERS THEN
            RAISE WARNING 'Error in log_user_event: %', SQLERRM;
            RETURN json_build_object('status', 'error', 'message', SQLERRM);
    END;
END;
$$;
