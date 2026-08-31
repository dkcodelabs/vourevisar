-- Performance-only policy updates. Commands, roles and access predicates remain unchanged.
ALTER POLICY "Users can view their own AI usage logs" ON public.ai_usage_logs
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Authors can manage own comments" ON public.comments
  USING (author_id = (SELECT auth.uid()));

ALTER POLICY "Users can manage their own cycle rotation snapshots" ON public.cycle_rotation_snapshots
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "notifications_insert_policy" ON public.notifications
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY "Users can manage their own pending merges" ON public.pending_cycle_merges
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Authors can manage own posts" ON public.posts
  USING (author_id = (SELECT auth.uid()));

ALTER POLICY "Users can manage own subject relations" ON public.subject_relations
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can insert own feedback" ON public.user_feedback_events
  WITH CHECK (actor_user_id = (SELECT auth.uid()));

ALTER POLICY "Users can view own feedback" ON public.user_feedback_events
  USING (actor_user_id = (SELECT auth.uid()));
