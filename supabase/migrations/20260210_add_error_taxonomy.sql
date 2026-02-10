-- Migration: Add Error Taxonomy Columns and Update RPC
-- Date: 2026-02-10

-- 1. Add new columns to admin_error_events
ALTER TABLE admin_error_events
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS recoverability TEXT,
ADD COLUMN IF NOT EXISTS is_user_visible BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS recommended_action TEXT,
ADD COLUMN IF NOT EXISTS fingerprint_version TEXT DEFAULT 'v1';

-- 2. Update RPC log_admin_error to accept new parameters
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
    p_scope TEXT DEFAULT 'admin',
    p_category TEXT DEFAULT 'unknown',
    p_recoverability TEXT DEFAULT 'non_retryable',
    p_is_user_visible BOOLEAN DEFAULT TRUE,
    p_recommended_action TEXT DEFAULT NULL,
    p_fingerprint_version TEXT DEFAULT 'v1'
)
RETURNS VOID AS $$
DECLARE
    v_fingerprint TEXT;
BEGIN
    -- Use provided fingerprint or fallback (though service should provide it)
    v_fingerprint := p_fingerprint;
    
    -- Insert with new fields
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
        v_fingerprint,
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
    ON CONFLICT (fingerprint) DO UPDATE SET
        last_seen_at = NOW(),
        occurrence_count = admin_error_events.occurrence_count + 1,
        status = CASE 
            WHEN admin_error_events.status = 'resolved' THEN 'new' 
            ELSE admin_error_events.status 
        END,
        -- Update variable fields if they changed (optional, keeping simple for now)
        metadata = p_metadata;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
