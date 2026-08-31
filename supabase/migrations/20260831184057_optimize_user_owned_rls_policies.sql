-- Keep the existing policy roles and commands. ALTER POLICY changes only the
-- auth expression so PostgreSQL evaluates it once per query rather than per row.
ALTER POLICY "Users can view their own API usage"
  ON public.api_usage
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can view own cycle study events"
  ON public.cycle_study_events
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can insert own cycle study events"
  ON public.cycle_study_events
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can update own cycle study events"
  ON public.cycle_study_events
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can delete own cycle study events"
  ON public.cycle_study_events
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "users_view_own_suggestions"
  ON public.edital_suggestions
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "users_insert_own_suggestions"
  ON public.edital_suggestions
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can manage their own pending extractions"
  ON public.pending_ai_extractions
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can view own ai extraction jobs"
  ON public.ai_extraction_jobs
  USING (user_id = (SELECT auth.uid()));
ALTER POLICY "Users can cancel own ai extraction jobs"
  ON public.ai_extraction_jobs
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- These two rules are exact duplicates of the retained policies below.
DROP POLICY IF EXISTS "users_view_own_notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "users_update_own_notifications" ON public.user_notifications;
ALTER POLICY "Users can view their own notifications"
  ON public.user_notifications
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can update their own notifications (mark as read)"
  ON public.user_notifications
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
