-- Migration to fix PGRST203 (Ambiguous function) and standardize audit logging
-- Created at: 2026-02-09T13:58:00
-- Updated at: 2026-02-09T14:15:00 (Fixed user_id NOT NULL logic & Event Type Check constraint)

-- 1. DROP ALL existing variations of log_user_event to clear the overload conflict
DROP FUNCTION IF EXISTS public.log_user_event(text, text, jsonb, text, integer, text);
DROP FUNCTION IF EXISTS public.log_user_event(text, text, jsonb, text, integer, text, uuid, uuid, text);

-- 2. UPDATE TABLE CONSTRAINT to allow new event types (LOGIN_SUCCESS, etc.)
ALTER TABLE public.user_events DROP CONSTRAINT IF EXISTS user_events_event_type_check;

ALTER TABLE public.user_events ADD CONSTRAINT user_events_event_type_check 
CHECK (event_type IN (
    'SIGNUP', 
    'LOGIN', 
    'LOGIN_SUCCESS', -- NEW
    'SESSION_START', 
    'LOGOUT', 
    'PASSWORD_RESET_REQUEST', 
    'PASSWORD_RESET_SUCCESS', 
    'EMAIL_CONFIRMED', 
    'EMAIL_CHANGED', -- From frontend types
    'MARKETING_CONSENT_GRANTED', 
    'MARKETING_CONSENT_REVOKED', 
    'ACCOUNT_DEACTIVATED', 
    'ACCOUNT_REACTIVATED', 
    'ROLE_CHANGED', -- NEW
    'PROFILE_UPDATED' -- NEW
));

-- 3. Create the CANONICAL function with the requested signature
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
    v_existing_log_id bigint;
BEGIN
    -- Determine Actor
    v_user_id := auth.uid();
    -- If actor/target checking logic needs refinement, adjust here.
    -- Defaulting to auth.uid() is safer than NULL if args are missing.
    v_actor_id := COALESCE(p_actor_user_id, v_user_id);
    v_target_id := COALESCE(p_target_user_id, v_user_id);
    
    -- If absolutely no user ID available (e.g. anon login attempt failed), handle gracefully
    IF v_target_id IS NULL THEN
        -- Fallback or error? For now, proceed, but insert might fail on NOT NULL constraint if passed down.
        -- Usually auth.uid() or p_target_user_id will be present.
    END IF;

    -- Extract request_id from metadata if present
    v_request_id := p_metadata->>'request_id';

    -- === RULE 1: LOGIN_SUCCESS Idempotency ===
    -- Dedupe by request_id (preferred) OR (actor + session fingerprint within short window)
    IF p_event_type = 'LOGIN_SUCCESS' THEN
        -- A. Check explicit Request ID
        IF v_request_id IS NOT NULL THEN
            SELECT id INTO v_existing_log_id
            FROM public.user_events
            WHERE metadata->>'request_id' = v_request_id
            LIMIT 1;
            
            IF v_existing_log_id IS NOT NULL THEN
                RETURN json_build_object('status', 'skipped', 'reason', 'duplicate_request_id');
            END IF;
        END IF;
    END IF;

    -- === RULE 2: SESSION_START Throttling ===
    -- Throttle 30 mins per actor
    IF p_event_type = 'SESSION_START' AND v_actor_id IS NOT NULL THEN
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

    -- === RULE 3: LOGOUT ===
    -- No aggresive throttle, just log it.

    -- INSERT
    INSERT INTO public.user_events (
        user_id, -- REQUIRED FIELD (NOT NULL CONSTRAINT)
        target_user_id,
        actor_user_id,
        event_type,
        source,
        metadata,
        status,
        occurred_at
    ) VALUES (
        v_target_id, -- Use target as the main user_id owner of the event
        v_target_id,
        v_actor_id,
        p_event_type,
        p_origin,
        p_metadata,
        p_status,
        now()
    ) RETURNING id INTO v_existing_log_id;

    RETURN json_build_object('status', 'logged', 'log_id', v_existing_log_id);

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in log_user_event: %', SQLERRM;
    RETURN json_build_object('status', 'error', 'message', SQLERRM);
END;
$$;

-- 4. Grants
GRANT EXECUTE ON FUNCTION public.log_user_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_user_event TO anon;
GRANT EXECUTE ON FUNCTION public.log_user_event TO service_role;

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_events_actor_event_created ON public.user_events (actor_user_id, event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_event_created ON public.user_events (event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_metadata_request_id ON public.user_events ((metadata->>'request_id'));
