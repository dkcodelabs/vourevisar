-- Optimizing RLS for user_roles and other important tables

-- USER_ROLES Table (Crucial for breaking loops)
DROP POLICY IF EXISTS "Users can view own roles via security definer" ON user_roles;
DROP POLICY IF EXISTS "Only admin functions can modify roles" ON user_roles;
DROP POLICY IF EXISTS "Only admin functions can update roles" ON user_roles;
DROP POLICY IF EXISTS "Only admin functions can delete roles" ON user_roles;
DROP POLICY IF EXISTS "Allow first owner insert" ON user_roles;

CREATE POLICY "user_roles_select_policy" ON user_roles FOR SELECT TO authenticated USING (
  user_id = (SELECT auth.uid()) OR is_owner((SELECT auth.uid()))
);

-- NOTIFICATIONS Table
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON notifications;
DROP POLICY IF EXISTS "Active users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Active users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

CREATE POLICY "notifications_select_policy" ON notifications FOR SELECT TO authenticated USING (
  user_id = (SELECT auth.uid()) 
);

CREATE POLICY "notifications_update_policy" ON notifications FOR UPDATE TO authenticated USING (
  user_id = (SELECT auth.uid())
);

CREATE POLICY "notifications_insert_policy" ON notifications FOR INSERT TO authenticated WITH CHECK (
  true -- System or Admin usually inserts, but if users can insert (e.g. feedback)
);

-- GENERAL_NOTES Table
DROP POLICY IF EXISTS "Users can view their own general notes" ON general_notes;
DROP POLICY IF EXISTS "Users can insert their own general notes" ON general_notes;
DROP POLICY IF EXISTS "Users can update their own general notes" ON general_notes;
DROP POLICY IF EXISTS "Users can delete their own general notes" ON general_notes;
DROP POLICY IF EXISTS "Active users can view own notes" ON general_notes;
DROP POLICY IF EXISTS "Active users can insert own notes" ON general_notes;
DROP POLICY IF EXISTS "Active users can update own notes" ON general_notes;
DROP POLICY IF EXISTS "Active users can delete own notes" ON general_notes;

CREATE POLICY "general_notes_select_policy" ON general_notes FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "general_notes_insert_policy" ON general_notes FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "general_notes_update_policy" ON general_notes FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "general_notes_delete_policy" ON general_notes FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- USER_SUBSCRIPTIONS Table
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Active users can view own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Active users can update own subscription" ON user_subscriptions;

CREATE POLICY "user_subscriptions_select_policy" ON user_subscriptions FOR SELECT TO authenticated USING (
  user_id = (SELECT auth.uid()) OR is_admin()
);
;
