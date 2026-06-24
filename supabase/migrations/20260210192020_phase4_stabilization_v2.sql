-- Phase 4: Stabilization & Environment Isolation

-- 1. Add Environment Column
ALTER TABLE admin_error_events 
ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'production';

CREATE INDEX IF NOT EXISTS idx_admin_error_events_environment ON admin_error_events(environment);

-- 2. Update log_admin_error to accept environment
CREATE OR REPLACE FUNCTION log_admin_error(
    p_error_id TEXT,
    p_module TEXT,
    p_action TEXT,
    p_user_message TEXT,
    p_technical_message TEXT,
    p_code TEXT,
    p_severity TEXT,
    p_retryable BOOLEAN,
    p_actor_user_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_fingerprint TEXT DEFAULT NULL,
    p_scope TEXT DEFAULT 'admin',
    p_category TEXT DEFAULT 'uncategorized',
    p_recoverability TEXT DEFAULT 'unknown',
    p_is_user_visible BOOLEAN DEFAULT FALSE,
    p_recommended_action TEXT DEFAULT NULL,
    p_fingerprint_version TEXT DEFAULT NULL,
    p_environment TEXT DEFAULT 'production' -- New Parameter
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_id UUID;
    v_new_id UUID;
BEGIN
    -- 1. Try to find an existing ACTIVE error with the same fingerprint AND environment
    IF p_fingerprint IS NOT NULL THEN
        SELECT id INTO v_existing_id
        FROM admin_error_events
        WHERE fingerprint = p_fingerprint
          AND environment = p_environment -- Scope to environment
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
        code,
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
        environment, -- New Column
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
        p_environment,
        'new',
        1,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;

-- 3. Update cleanup_error_logs with Smart Retention
-- DROP FIRST to handle return type change
DROP FUNCTION IF EXISTS cleanup_error_logs(integer);

CREATE OR REPLACE FUNCTION cleanup_error_logs(p_days_retention INT DEFAULT 30)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INT;
BEGIN
    -- Delete logs older than retention period, BUT PRESERVE:
    -- 1. Critical errors that are NOT resolved (status != 'resolved')
    -- 2. High recurrence errors (occurrence_count >= 20) regardless of status (for historical analysis)
    
    WITH deleted_rows AS (
        DELETE FROM admin_error_events
        WHERE created_at < NOW() - (p_days_retention || ' days')::INTERVAL
          -- Condition to DELETE:
          AND (
            -- Not critical OR (Critical but resolved)
            (severity != 'critical' OR status = 'resolved')
            AND
            -- Not high recurrence
            (occurrence_count < 20)
          )
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_count FROM deleted_rows;

    -- Log audit log event for cleanup
    -- (Assuming log_user_event exists, otherwise skip or implement simpler log)
    -- This is a system action, so actor_user_id might be null or system user
    
    RETURN format('Limpeza concluída. %s registros removidos (politica: >%s dias, exceto críticos abertos e alta recorrência).', v_deleted_count, p_days_retention);
END;
$$;;
