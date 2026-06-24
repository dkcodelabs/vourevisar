-- Final batch of RLS optimizations for all secondary tables

-- USER_CYCLES Table
DROP POLICY IF EXISTS "Users can create their own cycles" ON user_cycles;
DROP POLICY IF EXISTS "Users can delete their own cycles" ON user_cycles;
DROP POLICY IF EXISTS "Users can insert their own cycles" ON user_cycles;
DROP POLICY IF EXISTS "Users can update their own cycles" ON user_cycles;
DROP POLICY IF EXISTS "Active users can view own cycles" ON user_cycles;

CREATE POLICY "user_cycles_all_policy" ON user_cycles FOR ALL TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- POMODORO_SESSIONS Table
DROP POLICY IF EXISTS "Users can delete own pomodoro sessions" ON pomodoro_sessions;
DROP POLICY IF EXISTS "Users can insert own pomodoro sessions" ON pomodoro_sessions;
DROP POLICY IF EXISTS "Users can update own pomodoro sessions" ON pomodoro_sessions;
DROP POLICY IF EXISTS "Users can view own pomodoro sessions" ON pomodoro_sessions;

CREATE POLICY "pomodoro_sessions_all_policy" ON pomodoro_sessions FOR ALL TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- QUESTION_ATTEMPTS Table
DROP POLICY IF EXISTS "Users can create their own attempts" ON question_attempts;
DROP POLICY IF EXISTS "Users can delete own attempts" ON question_attempts;
DROP POLICY IF EXISTS "Users can update own attempts" ON question_attempts;
DROP POLICY IF EXISTS "Users can view their own attempts" ON question_attempts;

CREATE POLICY "question_attempts_all_policy" ON question_attempts FOR ALL TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- GENERAL_REMINDERS Table
DROP POLICY IF EXISTS "Users can delete their own reminders" ON general_reminders;
DROP POLICY IF EXISTS "Users can insert their own reminders" ON general_reminders;
DROP POLICY IF EXISTS "Users can update their own reminders" ON general_reminders;
DROP POLICY IF EXISTS "Users can view their own reminders" ON general_reminders;

CREATE POLICY "general_reminders_all_policy" ON general_reminders FOR ALL TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- USER_STUDY_ANALYTICS Table
DROP POLICY IF EXISTS "Users can manage own analytics" ON user_study_analytics;
DROP POLICY IF EXISTS "Users can view own analytics" ON user_study_analytics;

CREATE POLICY "user_study_analytics_all_policy" ON user_study_analytics FOR ALL TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- SUBJECT_MERGES / TOPIC_MERGES
DROP POLICY IF EXISTS "subject_merges_user_access" ON subject_merges;
DROP POLICY IF EXISTS "topic_merges_user_access" ON topic_merges;

CREATE POLICY "subject_merges_all_policy" ON subject_merges FOR ALL TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "topic_merges_all_policy" ON topic_merges FOR ALL TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- USER_EVENTS Table
DROP POLICY IF EXISTS "Admins can insert events" ON user_events;
DROP POLICY IF EXISTS "Active users can insert own events" ON user_events;
DROP POLICY IF EXISTS "Active users can view own events" ON user_events;

CREATE POLICY "user_events_all_policy" ON user_events FOR ALL TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- STUDY_SESSIONS Table
DROP POLICY IF EXISTS "Users can manage own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can manage their own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Active users can view own sessions" ON study_sessions;

CREATE POLICY "study_sessions_all_policy" ON study_sessions FOR ALL TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- USER_SETTINGS Table
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias configurações" ON user_settings;
DROP POLICY IF EXISTS "Active users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Active users can update own settings" ON user_settings;

CREATE POLICY "user_settings_all_policy" ON user_settings FOR ALL TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- ACTIVE_STUDY_TIMERS Table
DROP POLICY IF EXISTS "Usuário lê próprio timer" ON active_study_timers;
DROP POLICY IF EXISTS "Usuário insere próprio timer" ON active_study_timers;
DROP POLICY IF EXISTS "Usuário atualiza próprio timer" ON active_study_timers;
DROP POLICY IF EXISTS "Usuário deleta próprio timer" ON active_study_timers;

CREATE POLICY "active_study_timers_all_policy" ON active_study_timers FOR ALL TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- USER_EDITAIS Table
DROP POLICY IF EXISTS "Users can view own editais" ON user_editais;
DROP POLICY IF EXISTS "Users can insert own editais" ON user_editais;
DROP POLICY IF EXISTS "Users can update own editais" ON user_editais;
DROP POLICY IF EXISTS "Users can delete own editais" ON user_editais;

CREATE POLICY "user_editais_all_policy" ON user_editais FOR ALL TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- TOPIC_REVIEW_HISTORY Table
DROP POLICY IF EXISTS "Users can manage their own topic review history" ON topic_review_history;

CREATE POLICY "topic_review_history_all_policy" ON topic_review_history FOR ALL TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- PENDING_MERGE_SUGGESTIONS Table
DROP POLICY IF EXISTS "Users can view their own merge suggestions" ON pending_merge_suggestions;
DROP POLICY IF EXISTS "Users can update their own merge suggestions" ON pending_merge_suggestions;
DROP POLICY IF EXISTS "Users can insert their own merge suggestions" ON pending_merge_suggestions;
DROP POLICY IF EXISTS "Users can delete their own merge suggestions" ON pending_merge_suggestions;

CREATE POLICY "pending_merge_suggestions_all_policy" ON pending_merge_suggestions FOR ALL TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
;
