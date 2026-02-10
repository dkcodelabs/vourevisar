-- 1. Ensure scope column exists
ALTER TABLE admin_error_events 
ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'admin' CHECK (scope IN ('admin', 'core'));

CREATE INDEX IF NOT EXISTS idx_admin_error_events_scope ON admin_error_events(scope);

-- 2. Update RPC to accept p_scope and use advisory locks
CREATE OR REPLACE FUNCTION log_admin_error(
    p_error_id TEXT,
    p_module TEXT,
    p_action TEXT,
    p_user_message TEXT,
    p_technical_message TEXT,
    p_code TEXT,
    p_severity TEXT,
    p_retryable BOOLEAN,
    p_actor_user_id UUID,
    p_metadata JSONB,
    p_fingerprint TEXT,
    p_scope TEXT DEFAULT 'admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_id UUID;
    v_lock_id BIGINT;
BEGIN
    v_lock_id := hashtext(p_fingerprint);
    PERFORM pg_advisory_xact_lock(v_lock_id);

    SELECT id INTO v_existing_id
    FROM admin_error_events
    WHERE fingerprint = p_fingerprint
      AND status IN ('new', 'investigating')
      AND last_seen_at > (now() - INTERVAL '10 minutes')
    ORDER BY last_seen_at DESC
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        UPDATE admin_error_events
        SET 
            occurrence_count = occurrence_count + 1,
            last_seen_at = now(),
            updated_at = now(),
            scope = p_scope
        WHERE id = v_existing_id;
        
        RETURN jsonb_build_object('status', 'updated', 'id', v_existing_id);
    ELSE
        INSERT INTO admin_error_events (
            error_id, module, action, user_message, technical_message,
            code, severity, retryable, status, actor_user_id,
            metadata, fingerprint, occurrence_count, first_seen_at, last_seen_at,
            scope
        ) VALUES (
            p_error_id, p_module, p_action, p_user_message, p_technical_message,
            p_code, p_severity, p_retryable, 'new', p_actor_user_id,
            p_metadata, p_fingerprint, 1, now(), now(),
            p_scope
        );
        
        RETURN jsonb_build_object('status', 'inserted', 'error_id', p_error_id);
    END IF;
END;
$$;
