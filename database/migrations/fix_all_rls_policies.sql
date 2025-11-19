-- =====================================================
-- FIX: Políticas RLS para TODAS as tabelas principais
-- =====================================================
-- Este script garante que todas as tabelas tenham
-- políticas RLS seguras e funcionais
-- =====================================================

-- =====================================================
-- 1. TABELA: user_cycles
-- =====================================================

ALTER TABLE user_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own cycle data" ON user_cycles;
DROP POLICY IF EXISTS "Users can insert their own cycle data" ON user_cycles;
DROP POLICY IF EXISTS "Users can update their own cycle data" ON user_cycles;
DROP POLICY IF EXISTS "Users can delete their own cycle data" ON user_cycles;

CREATE POLICY "Users can view their own cycle data"
ON user_cycles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cycle data"
ON user_cycles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cycle data"
ON user_cycles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cycle data"
ON user_cycles FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- =====================================================
-- 2. TABELA: subjects
-- =====================================================

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can insert their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can update their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can delete their own subjects" ON subjects;

CREATE POLICY "Users can view their own subjects"
ON subjects FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subjects"
ON subjects FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subjects"
ON subjects FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subjects"
ON subjects FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- =====================================================
-- 3. TABELA: topics
-- =====================================================

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view topics of their subjects" ON topics;
DROP POLICY IF EXISTS "Users can insert topics to their subjects" ON topics;
DROP POLICY IF EXISTS "Users can update topics of their subjects" ON topics;
DROP POLICY IF EXISTS "Users can delete topics of their subjects" ON topics;

CREATE POLICY "Users can view topics of their subjects"
ON topics FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM subjects 
    WHERE subjects.id = topics.subject_id 
    AND subjects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert topics to their subjects"
ON topics FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM subjects 
    WHERE subjects.id = topics.subject_id 
    AND subjects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update topics of their subjects"
ON topics FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM subjects 
    WHERE subjects.id = topics.subject_id 
    AND subjects.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM subjects 
    WHERE subjects.id = topics.subject_id 
    AND subjects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete topics of their subjects"
ON topics FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM subjects 
    WHERE subjects.id = topics.subject_id 
    AND subjects.user_id = auth.uid()
  )
);

-- =====================================================
-- 4. TABELA: user_settings
-- =====================================================

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON user_settings;

CREATE POLICY "Users can view their own settings"
ON user_settings FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON user_settings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON user_settings FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
ON user_settings FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- =====================================================
-- 5. TABELA: study_sessions
-- =====================================================

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can insert their own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can update their own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can delete their own study sessions" ON study_sessions;

CREATE POLICY "Users can view their own study sessions"
ON study_sessions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study sessions"
ON study_sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study sessions"
ON study_sessions FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study sessions"
ON study_sessions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Listar todas as políticas criadas
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename IN ('user_cycles', 'subjects', 'topics', 'user_settings', 'study_sessions')
ORDER BY tablename, policyname;

-- Verificar se RLS está habilitado em todas as tabelas
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('user_cycles', 'subjects', 'topics', 'user_settings', 'study_sessions')
  AND schemaname = 'public'
ORDER BY tablename;
