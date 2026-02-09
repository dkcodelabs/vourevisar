-- 1. RENOMEAR COLUNA E ADICIONAR CONSTRAINT
ALTER TABLE public.user_events RENAME COLUMN source TO origin;

-- Adicionar Check Constraint
ALTER TABLE public.user_events 
ADD CONSTRAINT check_valid_origin 
CHECK (origin IN ('web_app', 'mobile_app', 'system'));

-- 2. BACKFILL DE DADOS
DO $$
BEGIN
    -- A. Garantir origin padrão se nulo
    UPDATE public.user_events 
    SET origin = 'web_app' 
    WHERE origin IS NULL;

    -- B. Migrar metadata.detail -> metadata.source se source estiver vazio
    UPDATE public.user_events
    SET metadata = (metadata - 'detail') || jsonb_build_object('source', metadata->>'detail')
    WHERE metadata ? 'detail' 
      AND (metadata->>'source' IS NULL OR metadata->>'source' = '');

    -- C. Remover metadata.detail residual (se houver duplicidade, o passo B já tratou a prioridade)
    UPDATE public.user_events
    SET metadata = metadata - 'detail'
    WHERE metadata ? 'detail';

END $$;

-- 3. ATUALIZAR RPC log_user_event
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
    
    v_final_origin text;
    v_final_metadata jsonb;
BEGIN
    -- Normalizar Origin e Metadata (metadata.source é o gatilho técnico)
    v_final_metadata := p_metadata;
    
    IF p_origin NOT IN ('web_app', 'mobile_app', 'system') THEN
        -- Se origin enviado for técnico (legado ou detalhe), move para metadata.source
        IF p_origin IS NOT NULL AND p_origin <> '' THEN
             v_final_metadata := jsonb_set(v_final_metadata, '{source}', to_jsonb(p_origin));
        END IF;
        v_final_origin := 'web_app'; -- Fallback padrão
    ELSE
        v_final_origin := p_origin;
    END IF;

    -- Extrair metadata.detail se ainda vir do frontend por algum motivo (safety)
    IF v_final_metadata ? 'detail' AND NOT (v_final_metadata ? 'source') THEN
        v_final_metadata := (v_final_metadata - 'detail') || jsonb_build_object('source', v_final_metadata->>'detail');
    END IF;

    -- Determine Actor
    v_user_id := auth.uid();
    v_actor_id := COALESCE(p_actor_user_id, v_user_id);
    v_target_id := COALESCE(p_target_user_id, v_user_id);
    
    -- Extract metadata fields
    v_request_id := v_final_metadata->>'request_id';
    v_dedupe_key := v_final_metadata->>'dedupe_key';
    v_session_fingerprint := v_final_metadata->>'session_fingerprint';

    -- === REGRAS DE IDEMPOTÊNCIA (Preservadas) ===
    
    -- LOGIN_SUCCESS
    IF p_event_type = 'LOGIN_SUCCESS' THEN
        IF v_request_id IS NOT NULL THEN
            SELECT id INTO v_existing_log_id FROM public.user_events 
            WHERE metadata->>'request_id' = v_request_id LIMIT 1;
            IF v_existing_log_id IS NOT NULL THEN
                RETURN json_build_object('status', 'skipped', 'reason', 'duplicate_request_id', 'origin', origin);
            END IF;
        END IF;
        
        IF v_session_fingerprint IS NOT NULL THEN
             SELECT id INTO v_existing_log_id FROM public.user_events 
             WHERE actor_user_id = v_actor_id 
               AND event_type = 'LOGIN_SUCCESS'
               AND metadata->>'session_fingerprint' = v_session_fingerprint
               AND occurred_at > (now() - interval '2 minutes')
             LIMIT 1;
             IF v_existing_log_id IS NOT NULL THEN
                RETURN json_build_object('status', 'skipped', 'reason', 'duplicate_login_window', 'origin', origin);
            END IF;
        END IF;
    END IF;

    -- LOGOUT (5s debounce)
    IF p_event_type = 'LOGOUT' AND v_actor_id IS NOT NULL THEN
        SELECT id INTO v_existing_log_id FROM public.user_events 
        WHERE actor_user_id = v_actor_id 
          AND event_type = 'LOGOUT'
          AND occurred_at > (now() - interval '5 seconds')
        LIMIT 1;
        IF v_existing_log_id IS NOT NULL THEN
            RETURN json_build_object('status', 'skipped', 'reason', 'logout_debounce', 'origin', origin);
        END IF;
    END IF;

    -- SESSION_START (30min)
    IF p_event_type = 'SESSION_START' AND v_actor_id IS NOT NULL THEN
        IF v_dedupe_key IS NOT NULL THEN
             SELECT id INTO v_existing_log_id FROM public.user_events 
             WHERE metadata->>'dedupe_key' = v_dedupe_key LIMIT 1;
             IF v_existing_log_id IS NOT NULL THEN
                RETURN json_build_object('status', 'skipped', 'reason', 'duplicate_session_key', 'origin', origin);
            END IF;
        END IF;
        SELECT id INTO v_existing_log_id FROM public.user_events
        WHERE actor_user_id = v_actor_id AND event_type = 'SESSION_START'
          AND occurred_at > (now() - interval '30 minutes') LIMIT 1;
        IF v_existing_log_id IS NOT NULL THEN
            RETURN json_build_object('status', 'skipped', 'reason', 'throttled', 'log_id', v_existing_log_id, 'origin', origin);
        END IF;
    END IF;

    -- INSERT
    BEGIN
        INSERT INTO public.user_events (
            user_id, target_user_id, actor_user_id, event_type, origin, metadata, status, occurred_at
        ) VALUES (
            v_target_id, v_target_id, v_actor_id, p_event_type, v_final_origin, v_final_metadata, p_status, now()
        ) RETURNING id INTO v_existing_log_id;
        
        RETURN json_build_object('status', 'logged', 'log_id', v_existing_log_id, 'origin', v_final_origin);
    EXCEPTION 
        WHEN OTHERS THEN
            RETURN json_build_object('status', 'error', 'message', SQLERRM);
    END;
END;
$$;
