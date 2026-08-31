-- Add only the covering indexes reported by the remote Supabase advisor.
-- This is additive: it does not alter RLS, grants, functions, or table data.
CREATE INDEX IF NOT EXISTS idx_admin_alert_events_acknowledged_by
  ON public.admin_alert_events (acknowledged_by);

CREATE INDEX IF NOT EXISTS idx_flashcard_schedules_item_id
  ON public.flashcard_schedules (item_id);

CREATE INDEX IF NOT EXISTS idx_subject_merges_cycle_id
  ON public.subject_merges (cycle_id);
