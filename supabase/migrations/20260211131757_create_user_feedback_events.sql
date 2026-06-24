
-- Phase 4.3: Create user_feedback_events table
CREATE TABLE IF NOT EXISTS user_feedback_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    feedback_id TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('improvement', 'feature_request', 'ux_issue')),
    title TEXT NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 500),
    description TEXT NOT NULL CHECK (char_length(description) > 0 AND char_length(description) <= 5000),
    impact TEXT NOT NULL DEFAULT 'medium' CHECK (impact IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'in_progress', 'resolved', 'wont_fix')),
    actor_user_id UUID NOT NULL REFERENCES auth.users(id),
    actor_email TEXT,
    route_path TEXT,
    feature_area TEXT,
    context_label TEXT,
    related_error_id TEXT,
    session_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    admin_notes TEXT
);

COMMENT ON TABLE user_feedback_events IS 'Canal de feedback de produto. Separado do pipeline de erros técnicos (admin_error_events).';

-- Indexes
CREATE INDEX idx_feedback_created_at ON user_feedback_events (created_at DESC);
CREATE INDEX idx_feedback_status ON user_feedback_events (status);
CREATE INDEX idx_feedback_type ON user_feedback_events (type);
CREATE INDEX idx_feedback_actor ON user_feedback_events (actor_user_id);
CREATE INDEX idx_feedback_error_link ON user_feedback_events (related_error_id) WHERE related_error_id IS NOT NULL;

-- RLS
ALTER TABLE user_feedback_events ENABLE ROW LEVEL SECURITY;

-- Users can INSERT their own feedback
CREATE POLICY "Users can insert own feedback"
    ON user_feedback_events
    FOR INSERT
    TO authenticated
    WITH CHECK (actor_user_id = auth.uid());

-- Admin/Owner can SELECT all feedback
CREATE POLICY "Admins can view all feedback"
    ON user_feedback_events
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'owner')
        )
    );

-- Admin/Owner can UPDATE all feedback (triage, notes, status)
CREATE POLICY "Admins can update all feedback"
    ON user_feedback_events
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'owner')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'owner')
        )
    );
;
