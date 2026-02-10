-- Drop ALL likely signatures to be safe
DROP FUNCTION IF EXISTS log_admin_error(text, text, text, text, text, text, text, boolean, uuid, jsonb, text);
DROP FUNCTION IF EXISTS log_admin_error(text, text, text, text, text, text, text, boolean, uuid, jsonb, text, text);
DROP FUNCTION IF EXISTS log_admin_error(text, text, text, text, text, text, text, boolean, uuid, jsonb, text, text, text, text, boolean, text, text);
DROP FUNCTION IF EXISTS log_admin_error(uuid, text, text, text, text, text, text, boolean, uuid, jsonb, text, text, text, text, boolean, text, text);

-- Recreate with p_error_id TEXT
CREATE OR REPLACE FUNCTION log_admin_error(
    p_error_id TEXT, -- Changed from UUID to TEXT
    p_module TEXT,
    p_action TEXT,
    p_user_message TEXT,
    p_technical_message TEXT,
    p_code TEXT,
    p_severity TEXT,
    p_retryable BOOLEAN,
    p_actor_user_id UUID,
    p_metadata JSONB,
    p_fingerprint TEXT DEFAULT NULL,
    p_scope TEXT DEFAULT 'admin',
    p_category TEXT DEFAULT 'uncategorized',
    p_recoverability TEXT DEFAULT 'unknown',
    p_is_user_visible BOOLEAN DEFAULT FALSE,
    p_recommended_action TEXT DEFAULT NULL,
    p_fingerprint_version TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_id UUID;
    v_new_id UUID;
BEGIN
    -- 1. Try to find an existing ACTIVE error with the same fingerprint
    IF p_fingerprint IS NOT NULL THEN
        SELECT id INTO v_existing_id
        FROM admin_error_events
        WHERE fingerprint = p_fingerprint
          AND status IN ('new', 'investigating')
        LIMIT 1;
        
        IF v_existing_id IS NOT NULL THEN
            -- Update existing error
            UPDATE admin_error_events
            SET 
                occurrence_count = occurrence_count + 1,
                updated_at = NOW(),
                last_seen_at = NOW(),
                metadata = p_metadata
            WHERE id = v_existing_id;
            
            RETURN v_existing_id;
        END IF;
    END IF;

    -- 2. Insert new error
    INSERT INTO admin_error_events (
        error_id,
        module,
        action,
        user_message,
        technical_message,
        error_code,
        severity,
        retryable,
        actor_user_id,
        metadata,
        fingerprint,
        scope,
        category,
        recoverability,
        is_user_visible,
        recommended_action,
        fingerprint_version,
        status,
        occurrence_count,
        first_seen_at,
        last_seen_at
    ) VALUES (
        p_error_id,
        p_module,
        p_action,
        p_user_message,
        p_technical_message,
        p_code,
        p_severity,
        p_retryable,
        p_actor_user_id,
        p_metadata,
        p_fingerprint,
        p_scope,
        p_category,
        p_recoverability,
        p_is_user_visible,
        p_recommended_action,
        p_fingerprint_version,
        'new',
        1,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;
