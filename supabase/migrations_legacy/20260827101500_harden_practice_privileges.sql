-- The project has historical default privileges that grant DML and EXECUTE to
-- API roles on newly created public objects. RLS is not a substitute for an
-- explicit least-privilege grant contract, especially for SECURITY DEFINER
-- functions that handle answer keys and attempt evaluation.

revoke all on table
  public.practice_packages,
  public.practice_items,
  public.practice_sessions,
  public.practice_session_items,
  public.practice_attempts,
  public.flashcard_schedules,
  public.topic_learning_signals,
  public.practice_item_feedback,
  public.practice_item_reports
from public, anon, authenticated;

revoke all on table private.practice_item_answers
from public, anon, authenticated;

-- Students can read only the RLS-filtered, non-sensitive projections. All
-- state changes continue through authenticated Edge Functions using the
-- service_role client.
grant select on table
  public.practice_packages,
  public.practice_items,
  public.practice_sessions,
  public.practice_session_items,
  public.practice_attempts,
  public.flashcard_schedules,
  public.topic_learning_signals,
  public.practice_item_feedback,
  public.practice_item_reports
to authenticated;

revoke all on function public.create_practice_session_internal(
  uuid,
  uuid,
  public.practice_session_mode,
  uuid,
  jsonb,
  jsonb
) from public, anon, authenticated;

grant execute on function public.create_practice_session_internal(
  uuid,
  uuid,
  public.practice_session_mode,
  uuid,
  jsonb,
  jsonb
) to service_role;

revoke all on function public.get_practice_item_answer_internal(
  uuid,
  uuid,
  uuid,
  boolean
) from public, anon, authenticated;

grant execute on function public.get_practice_item_answer_internal(
  uuid,
  uuid,
  uuid,
  boolean
) to service_role;

revoke all on function public.submit_practice_attempt_internal(
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb,
  integer,
  text
) from public, anon, authenticated;

grant execute on function public.submit_practice_attempt_internal(
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb,
  integer,
  text
) to service_role;
