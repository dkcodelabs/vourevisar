-- Phase 4.2-A: Context Enrichment
-- Description: Adds optional context columns to admin_error_events and updates log_admin_error RPC.

-- 1. Add new columns to admin_error_events
ALTER TABLE admin_error_events
ADD COLUMN IF NOT EXISTS route_path text,
ADD COLUMN IF NOT EXISTS feature_area text,
ADD COLUMN IF NOT EXISTS actor_user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS actor_email text,
ADD COLUMN IF NOT EXISTS target_user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS target_email text,
ADD COLUMN IF NOT EXISTS session_id text,
ADD COLUMN IF NOT EXISTS request_id text,
ADD COLUMN IF NOT EXISTS context_label text;

-- 2. Update log_admin_error RPC to accept new parameters
CREATE OR REPLACE FUNCTION log_admin_error(
    p_error_id text,
    p_module text,
    p_action text,
    p_user_message text,
    p_technical_message text,
    p_code text DEFAULT NULL,
    p_severity text DEFAULT 'medium',
    p_retryable boolean DEFAULT false,
    p_actor_user_id uuid DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'::jsonb,
    p_fingerprint text DEFAULT NULL,
    p_scope text DEFAULT 'core',
    p_category text DEFAULT 'unknown',
    p_recoverability text DEFAULT 'non_retryable',
    p_is_user_visible boolean DEFAULT true,
    p_recommended_action text DEFAULT NULL,
    p_fingerprint_version text DEFAULT 'v1',
    p_environment text DEFAULT 'production',
    -- New Parameters (Optional)
    p_route_path text DEFAULT NULL,
    p_feature_area text DEFAULT NULL,
    p_actor_email text DEFAULT NULL,
    p_target_user_id uuid DEFAULT NULL,
    p_target_email text DEFAULT NULL,
    p_session_id text DEFAULT NULL,
    p_request_id text DEFAULT NULL,
    p_context_label text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert new error record with all fields
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
        environment,
        -- New Columns
        route_path,
        feature_area,
        actor_email,
        target_user_id,
        target_email,
        session_id,
        request_id,
        context_label
    ) VALUES (
        p_error_id,
        p_module,
        p_action,
        p_user_message,
        p_technical_message,
        p_code,
        p_severity::error_severity_enum, -- Cast to enum if necessary, or ensure text matches
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
        -- New Values
        p_route_path,
        p_feature_area,
        p_actor_email,
        p_target_user_id,
        p_target_email,
        p_session_id,
        p_request_id,
        p_context_label
    );

    -- Basic retention policy check (optional, can be done via cron)
    -- DELETE FROM admin_error_events WHERE created_at < now() - interval '30 days';

EXCEPTION WHEN OTHERS THEN
    -- Fallback logging to internal postgres logs if insert fails
    RAISE WARNING 'Failed to log admin error: % %', SQLERRM, SQLSTATE;
END;
$$;
