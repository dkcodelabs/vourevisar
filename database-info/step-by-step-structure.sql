-- ========================================
-- ESTRUTURA DO BANCO - PASSO A PASSO
-- Execute uma query por vez
-- ========================================

-- QUERY 1: LISTAR TODAS AS TABELAS
SELECT 
  table_schema as schema,
  table_name as tabela
FROM information_schema.tables 
WHERE table_schema IN ('public', 'auth')
ORDER BY table_schema, table_name;

-- QUERY 2: COLUNAS DA TABELA SUBJECTS
SELECT 
  column_name as coluna,
  data_type as tipo,
  is_nullable as permite_null
FROM information_schema.columns 
WHERE table_name = 'subjects' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- QUERY 3: COLUNAS DA TABELA TOPICS
SELECT 
  column_name as coluna,
  data_type as tipo,
  is_nullable as permite_null
FROM information_schema.columns 
WHERE table_name = 'topics' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- QUERY 4: COLUNAS DA TABELA USER_CYCLES
SELECT 
  column_name as coluna,
  data_type as tipo,
  is_nullable as permite_null
FROM information_schema.columns 
WHERE table_name = 'user_cycles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- QUERY 5: VERIFICAR SE SEU USUÁRIO EXISTE
SELECT COUNT(*) as usuario_existe 
FROM auth.users 
WHERE email = 'dwefotografia@gmail.com';