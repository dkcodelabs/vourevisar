-- Optimizing RLS for subjects and topics to solve 502 errors and improve performance

-- SUBJECTS Table
DROP POLICY IF EXISTS "Users can view their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can create their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can update their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can delete their own subjects" ON subjects;
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias disciplinas" ON subjects;

CREATE POLICY "subjects_select_policy" ON subjects FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "subjects_insert_policy" ON subjects FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "subjects_update_policy" ON subjects FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "subjects_delete_policy" ON subjects FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- TOPICS Table
DROP POLICY IF EXISTS "Users can view topics of their subjects" ON topics;
DROP POLICY IF EXISTS "Users can create topics in their subjects" ON topics;
DROP POLICY IF EXISTS "Users can update topics in their subjects" ON topics;
DROP POLICY IF EXISTS "Users can delete topics in their subjects" ON topics;
DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios tópicos" ON topics;
DROP POLICY IF EXISTS "Active users can view own topics" ON topics;
DROP POLICY IF EXISTS "Active users can insert topics" ON topics;
DROP POLICY IF EXISTS "Active users can update topics" ON topics;
DROP POLICY IF EXISTS "Active users can delete topics" ON topics;

CREATE POLICY "topics_select_policy" ON topics FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM subjects s 
    WHERE s.id = topics.subject_id 
    AND s.user_id = (SELECT auth.uid())
  ) AND is_user_active()
);

CREATE POLICY "topics_insert_policy" ON topics FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM subjects s 
    WHERE s.id = topics.subject_id 
    AND s.user_id = (SELECT auth.uid())
  ) AND is_user_active()
);

CREATE POLICY "topics_update_policy" ON topics FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM subjects s 
    WHERE s.id = topics.subject_id 
    AND s.user_id = (SELECT auth.uid())
  ) AND is_user_active()
);

CREATE POLICY "topics_delete_policy" ON topics FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM subjects s 
    WHERE s.id = topics.subject_id 
    AND s.user_id = (SELECT auth.uid())
  ) AND is_user_active()
);
;
