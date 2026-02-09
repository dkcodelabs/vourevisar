-- =====================================================
-- MIGRATION: Sprint 3 - Final Hardening (Concurrency)
-- PURPOSE: Add advisory locks to RPC to prevent race conditions
-- DATE: 2026-02-09
-- =====================================================

-- 1. Update RPC: Log Error with Advisory Lock
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
    p_fingerprint TEXT
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
    -- Generate a lock ID based on the fingerprint hash
    -- This ensures that concurrent requests for the SAME fingerprint wait for each other
    -- without locking the entire table.
    v_lock_id := hashtext(p_fingerprint);
    
    -- Acquire transaction-level advisory lock
    -- Will release automatically at end of transaction
    PERFORM pg_advisory_xact_lock(v_lock_id);

    -- Check for existing error with same fingerprint in the last 10 minutes
    -- and status 'new' or 'investigating'
    SELECT id INTO v_existing_id
    FROM admin_error_events
    WHERE fingerprint = p_fingerprint
      AND status IN ('new', 'investigating')
      AND last_seen_at > (now() - INTERVAL '10 minutes')
    ORDER BY last_seen_at DESC
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        -- Deduplicate: Update existing record
        UPDATE admin_error_events
        SET 
            occurrence_count = occurrence_count + 1,
            last_seen_at = now(),
            updated_at = now()
        WHERE id = v_existing_id;
        
        RETURN jsonb_build_object('status', 'updated', 'id', v_existing_id);
    ELSE
        -- New Error: Insert Record
        INSERT INTO admin_error_events (
            error_id, module, action, user_message, technical_message,
            code, severity, retryable, status, actor_user_id,
            metadata, fingerprint, occurrence_count, first_seen_at, last_seen_at
        ) VALUES (
            p_error_id, p_module, p_action, p_user_message, p_technical_message,
            p_code, p_severity, p_retryable, 'new', p_actor_user_id,
            p_metadata, p_fingerprint, 1, now(), now()
        );
        
        RETURN jsonb_build_object('status', 'inserted', 'error_id', p_error_id);
    END IF;
END;
$$;

COMMENT ON FUNCTION log_admin_error IS 'Logs an error with server-side deduplication and advisory locks for concurrency safety';
