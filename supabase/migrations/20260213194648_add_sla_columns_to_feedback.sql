ALTER TABLE user_feedback_events 
ADD COLUMN IF NOT EXISTS sla_first_response_due_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS sla_resolution_due_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS sla_breached_first_response boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sla_breached_resolution boolean DEFAULT false;;
