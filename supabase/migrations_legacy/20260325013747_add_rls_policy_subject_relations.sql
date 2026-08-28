
ALTER TABLE subject_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own subject relations" ON subject_relations;

CREATE POLICY "Users can manage own subject relations" ON subject_relations 
FOR ALL USING (auth.uid() = user_id);
;
