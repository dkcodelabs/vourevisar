-- Remove only indexes confirmed identical by the Supabase performance advisor.
-- The surviving names are the ones used by the current schema conventions.
drop index if exists public.idx_admin_errors_created_at;
drop index if exists public.idx_admin_errors_module;
drop index if exists public.idx_admin_errors_severity;
drop index if exists public.idx_admin_errors_status;
drop index if exists public.idx_user_events_request_id;
drop index if exists public.idx_user_events_type_occurred;
drop index if exists public.idx_feedback_actor_user;
