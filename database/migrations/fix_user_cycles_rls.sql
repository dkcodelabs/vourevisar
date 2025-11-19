-- =====================================================
-- FIX: Políticas RLS para tabela user_cycles
-- =====================================================
-- Este script corrige o erro 406 (Not Acceptable) 
-- adicionando políticas RLS seguras para user_cycles
-- =====================================================

-- 1. Habilitar RLS na tabela user_cycles (se ainda não estiver)
ALTER TABLE user_cycles ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Users can view their own cycle data" ON user_cycles;
DROP POLICY IF EXISTS "Users can insert their own cycle data" ON user_cycles;
DROP POLICY IF EXISTS "Users can update their own cycle data" ON user_cycles;
DROP POLICY IF EXISTS "Users can delete their own cycle data" ON user_cycles;

-- 3. Criar políticas RLS seguras

-- Política SELECT: Usuários podem ver apenas seus próprios dados
CREATE POLICY "Users can view their own cycle data"
ON user_cycles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Política INSERT: Usuários podem criar apenas seus próprios dados
CREATE POLICY "Users can insert their own cycle data"
ON user_cycles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Política UPDATE: Usuários podem atualizar apenas seus próprios dados
CREATE POLICY "Users can update their own cycle data"
ON user_cycles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política DELETE: Usuários podem deletar apenas seus próprios dados
CREATE POLICY "Users can delete their own cycle data"
ON user_cycles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Verificar se as políticas foram criadas corretamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_cycles'
ORDER BY policyname;

-- 5. Testar se o usuário consegue acessar seus dados
-- (Descomente para testar após aplicar)
-- SELECT * FROM user_cycles WHERE user_id = auth.uid() LIMIT 1;
