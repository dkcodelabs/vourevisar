
-- Phase 4.4: Operations - Triage, SLA & Action Timeline

ALTER TABLE admin_error_events
    ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS triage_note TEXT,
    ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_error_assigned_to ON admin_error_events (assigned_to) WHERE assigned_to IS NOT NULL;

ALTER TABLE user_feedback_events
    ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS response_note TEXT;

CREATE INDEX IF NOT EXISTS idx_feedback_assigned_to ON user_feedback_events (assigned_to) WHERE assigned_to IS NOT NULL;

CREATE TABLE IF NOT EXISTS incident_action_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    incident_id TEXT NOT NULL,
    incident_type TEXT NOT NULL CHECK (incident_type IN ('error', 'feedback')),
    action_type TEXT NOT NULL CHECK (action_type IN ('status_change', 'assignment', 'triage_note', 'response_note', 'reassignment')),
    old_value TEXT,
    new_value TEXT,
    note TEXT,
    actor_user_id UUID NOT NULL REFERENCES auth.users(id),
    actor_email TEXT
);

CREATE INDEX IF NOT EXISTS idx_action_log_incident ON incident_action_log (incident_id, incident_type);
CREATE INDEX IF NOT EXISTS idx_action_log_created ON incident_action_log (created_at DESC);

ALTER TABLE incident_action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view action logs"
    ON incident_action_log
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Admins can insert action logs"
    ON incident_action_log
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'owner')
        )
    );
;
