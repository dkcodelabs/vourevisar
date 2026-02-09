-- =====================================================
-- MIGRATION: Phase 2 - Error System Expansion
-- PURPOSE: Server-side deduplication and log retention
-- DATE: 2026-02-09
-- =====================================================

-- 1. Add fingerprint column for deduplication
ALTER TABLE admin_error_events 
ADD COLUMN IF NOT EXISTS fingerprint TEXT;

CREATE INDEX IF NOT EXISTS idx_admin_error_events_fingerprint ON admin_error_events(fingerprint);

-- 2. RPC: Log Error with Deduplication (Upsert-like logic)
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
SECURITY DEFINER -- Runs with owner privileges to ensure access to table
SET search_path = public
AS $$
DECLARE
    v_existing_id UUID;
    v_new_record JSONB;
BEGIN
    -- Check for existing error with same fingerprint in the last 10 minutes
    -- and status 'new' or 'investigating' (to avoid reviving resolved errors)
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

-- 3. RPC: Cleanup Old Logs (Retention Policy)
CREATE OR REPLACE FUNCTION cleanup_error_logs(p_days_retention INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM admin_error_events
    WHERE created_at < (now() - (p_days_retention || ' days')::INTERVAL);
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$;

-- 4. Grant execute permissions to authenticated users (so errorService can call it)
GRANT EXECUTE ON FUNCTION log_admin_error TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_error_logs TO authenticated;

COMMENT ON FUNCTION log_admin_error IS 'Logs an error with server-side deduplication based on fingerprint and 10min window';
COMMENT ON FUNCTION cleanup_error_logs IS 'Deletes error logs older than N days (default 30)';
