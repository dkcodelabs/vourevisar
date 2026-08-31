-- Preserve the existing permissive-policy scope (PUBLIC and FOR ALL) while
-- moving auth.uid() into an initplan. This changes only evaluation cost.
DROP POLICY IF EXISTS "Users can manage their own v2 cycles" ON public.study_cycles_v2;
CREATE POLICY "Users can manage their own v2 cycles"
  ON public.study_cycles_v2
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage their own rotations" ON public.cycle_rotations;
CREATE POLICY "Users can manage their own rotations"
  ON public.cycle_rotations
  USING (
    EXISTS (
      SELECT 1
      FROM public.study_cycles_v2
      WHERE study_cycles_v2.id = cycle_rotations.cycle_id
        AND study_cycles_v2.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage their own subject states" ON public.cycle_subject_states;
CREATE POLICY "Users can manage their own subject states"
  ON public.cycle_subject_states
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage their own study logs" ON public.cycle_study_logs;
CREATE POLICY "Users can manage their own study logs"
  ON public.cycle_study_logs
  USING ((SELECT auth.uid()) = user_id);
