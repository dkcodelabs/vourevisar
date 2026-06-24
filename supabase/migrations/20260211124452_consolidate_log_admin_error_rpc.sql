
-- Drop ALL overloads (3 versions with different signatures and return types)
DROP FUNCTION IF EXISTS log_admin_error(text,text,text,text,text,text,text,boolean,uuid,jsonb,text,text,text,text,boolean,text,text);
DROP FUNCTION IF EXISTS log_admin_error(text,text,text,text,text,text,text,boolean,uuid,jsonb,text,text,text,text,boolean,text,text,text);
DROP FUNCTION IF EXISTS log_admin_error(text,text,text,text,text,text,text,boolean,uuid,jsonb,text,text,text,text,boolean,text,text,text,text,text,text,uuid,text,text,text,text);

-- Recreate single definitive function returning UUID
CREATE OR REPLACE FUNCTION log_admin_error(
    p_error_id TEXT,
    p_module TEXT,
    p_action TEXT,
    p_user_message TEXT,
    p_technical_message TEXT,
    p_code TEXT DEFAULT NULL,
    p_severity TEXT DEFAULT 'medium',
    p_retryable BOOLEAN DEFAULT FALSE,
    p_actor_user_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_fingerprint TEXT DEFAULT NULL,
    p_scope TEXT DEFAULT 'core',
    p_category TEXT DEFAULT 'unknown',
    p_recoverability TEXT DEFAULT 'non_retryable',
    p_is_user_visible BOOLEAN DEFAULT TRUE,
    p_recommended_action TEXT DEFAULT NULL,
    p_fingerprint_version TEXT DEFAULT 'v1',
    p_environment TEXT DEFAULT 'production',
    p_route_path TEXT DEFAULT NULL,
    p_feature_area TEXT DEFAULT NULL,
    p_actor_email TEXT DEFAULT NULL,
    p_target_user_id UUID DEFAULT NULL,
    p_target_email TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL,
    p_context_label TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_id UUID;
    v_new_id UUID;
BEGIN
    -- 1. Dedup: find existing ACTIVE error with same fingerprint + environment
    IF p_fingerprint IS NOT NULL THEN
        SELECT id INTO v_existing_id
        FROM admin_error_events
        WHERE fingerprint = p_fingerprint
          AND environment = p_environment
          AND status IN ('new', 'investigating')
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
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

    -- 2. Insert new error with all fields
    INSERT INTO admin_error_events (
        error_id, module, action, user_message, technical_message,
        code, severity, retryable, actor_user_id, metadata,
        fingerprint, scope, category, recoverability, is_user_visible,
        recommended_action, fingerprint_version, environment,
        route_path, feature_area, actor_email, target_user_id, target_email,
        session_id, request_id, context_label,
        status, occurrence_count, first_seen_at, last_seen_at
    ) VALUES (
        p_error_id, p_module, p_action, p_user_message, p_technical_message,
        p_code, p_severity, p_retryable, p_actor_user_id, p_metadata,
        p_fingerprint, p_scope, p_category, p_recoverability, p_is_user_visible,
        p_recommended_action, p_fingerprint_version, p_environment,
        p_route_path, p_feature_area, p_actor_email, p_target_user_id, p_target_email,
        p_session_id, p_request_id, p_context_label,
        'new', 1, NOW(), NOW()
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;
;
