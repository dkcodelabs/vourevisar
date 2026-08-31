-- Cover foreign keys on the high traffic study, review and practice paths.
-- These are additive indexes and do not change query semantics or RLS.
create index if not exists idx_active_study_timers_topic_id on public.active_study_timers (topic_id);
create index if not exists idx_cycle_rotations_cycle_id on public.cycle_rotations (cycle_id);
create index if not exists idx_cycle_study_logs_rotation_id on public.cycle_study_logs (rotation_id);
create index if not exists idx_cycle_study_logs_subject_id on public.cycle_study_logs (subject_id);
create index if not exists idx_cycle_subject_states_subject_id on public.cycle_subject_states (subject_id);
create index if not exists idx_practice_attempts_topic_id on public.practice_attempts (topic_id);
create index if not exists idx_practice_attempts_user_session_item on public.practice_attempts (user_id, session_id, item_id);
create index if not exists idx_practice_generation_runs_package_id on public.practice_generation_runs (package_id);
create index if not exists idx_practice_generation_runs_topic_id on public.practice_generation_runs (topic_id);
create index if not exists idx_practice_item_feedback_item_id on public.practice_item_feedback (item_id);
create index if not exists idx_practice_item_feedback_session_id on public.practice_item_feedback (session_id);
create index if not exists idx_practice_item_reports_item_id on public.practice_item_reports (item_id);
create index if not exists idx_practice_packages_topic_id on public.practice_packages (topic_id);
create index if not exists idx_practice_session_items_item_id on public.practice_session_items (item_id);
create index if not exists idx_practice_session_items_topic_id on public.practice_session_items (topic_id);
create index if not exists idx_practice_sessions_cycle_id on public.practice_sessions (cycle_id);
create index if not exists idx_practice_sessions_topic_id on public.practice_sessions (topic_id);
create index if not exists idx_topic_learning_signals_topic_id on public.topic_learning_signals (topic_id);
create index if not exists idx_topic_merges_cycle_id on public.topic_merges (cycle_id);
create index if not exists idx_topic_review_history_cycle_id on public.topic_review_history (cycle_id);
create index if not exists idx_topic_review_history_edital_id on public.topic_review_history (edital_id);
