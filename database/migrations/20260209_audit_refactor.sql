-- 1. Index for idempotency on request_id to prevent duplicate LOGIN_SUCCESS logs
CREATE INDEX IF NOT EXISTS idx_user_events_request_id ON public.user_events ((metadata->>'request_id'));

-- 2. Index for effective throttling of SESSION_START
CREATE INDEX IF NOT EXISTS idx_user_events_session_throttle ON public.user_events (actor_user_id, event_type, occurred_at);

-- 3. Redefine logic for log_user_event with idempotency and throttling
CREATE OR REPLACE FUNCTION public.log_user_event(
    p_event_type text,
    p_source text,
    p_metadata jsonb,
    p_tz text,
    p_utc_offset_minutes integer,
    p_user_agent text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_request_id text;
    v_existing_log_id bigint;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    -- If no user logged in, use a system user ID or handle appropriately
    -- For this context, we assume auth.uid() is present for these events
    IF v_user_id IS NULL THEN
        -- Allow logging for anonymous events if needed, but for now return error
        -- Or proceed with NULL actor_user_id if schema allows
        v_user_id := NULL; -- Proceed with null
    END IF;

    -- Extract request_id from metadata if present
    v_request_id := p_metadata->>'request_id';

    -- 1. LOGIN_SUCCESS Idempotency check
    -- Only check if we have a request_id to dedupe against
    IF p_event_type = 'LOGIN_SUCCESS' AND v_request_id IS NOT NULL THEN
        SELECT id INTO v_existing_log_id
        FROM public.user_events
        WHERE metadata->>'request_id' = v_request_id
        LIMIT 1;

        IF v_existing_log_id IS NOT NULL THEN
            RETURN json_build_object(
                'status', 'skipped',
                'reason', 'duplicate_request_id',
                'log_id', v_existing_log_id
            );
        END IF;
    END IF;

    -- 2. SESSION_START Throttle check (30 mins)
    IF p_event_type = 'SESSION_START' AND v_user_id IS NOT NULL THEN
        -- Check if we logged a SESSION_START for this user in the last 30 minutes
        SELECT id INTO v_existing_log_id
        FROM public.user_events
        WHERE actor_user_id = v_user_id
          AND event_type = 'SESSION_START'
          AND occurred_at > (now() - interval '30 minutes')
        LIMIT 1;

        IF v_existing_log_id IS NOT NULL THEN
            RETURN json_build_object(
                'status', 'skipped',
                'reason', 'throttled',
                'log_id', v_existing_log_id
            );
        END IF;
    END IF;

    -- 3. Insert the log
    INSERT INTO public.user_events (
        event_type,
        occurred_at,
        actor_user_id,
        target_user_id, -- Self-target for auth events
        source,
        metadata,
        status -- Explicitly setting status to SUCCESS
    ) VALUES (
        p_event_type,
        now(),
        v_user_id,
        v_user_id, -- For login/session, target is usually the actor
        p_source,
        p_metadata || jsonb_build_object(
            'tz', p_tz,
            'utc_offset', p_utc_offset_minutes,
            'user_agent', p_user_agent
        ),
        'SUCCESS' -- Default status for logged events
    ) RETURNING id INTO v_existing_log_id;

    RETURN json_build_object(
        'status', 'logged',
        'log_id', v_existing_log_id
    );
EXCEPTION WHEN OTHERS THEN
    -- Fallback logging in case of error
    RAISE WARNING 'Error in log_user_event: %', SQLERRM;
    RETURN json_build_object('status', 'error', 'message', SQLERRM);
END;
$$;
