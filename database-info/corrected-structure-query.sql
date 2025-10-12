-- ========================================
-- ANÁLISE COMPLETA DA ESTRUTURA DO BANCO
-- USUÁRIO CORRETO: dwefotografia@gmail.com
-- ========================================

-- 1. ESTRUTURA DAS TABELAS PRINCIPAIS
SELECT 
  'TABELA: subjects' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'subjects' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 
  'TABELA: topics' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'topics' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 
  'TABELA: user_cycles' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_cycles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. VERIFICAR SEU USER_ID E DADOS
SELECT 
  'SEU USER_ID' as info,
  id as user_id,
  email,
  created_at
FROM auth.users 
WHERE email = 'dwefotografia@gmail.com';

-- 3. SUAS MATÉRIAS E ESTRUTURA
SELECT 
  'SUAS MATÉRIAS' as info,
  id,
  name,
  status,
  user_id,
  created_at
FROM subjects 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com')
ORDER BY name;

-- 4. ESTRUTURA DO SEU CICLO ATUAL
SELECT 
  'SEU CICLO ATUAL' as info,
  user_id,
  ciclos_realizados,
  ciclo_atual,
  materias_estudadas_ciclo,
  pg_typeof(ciclo_atual) as tipo_ciclo_atual,
  pg_typeof(materias_estudadas_ciclo) as tipo_materias_estudadas,
  array_length(ciclo_atual, 1) as qtd_materias_ciclo,
  array_length(materias_estudadas_ciclo, 1) as qtd_materias_estudadas,
  created_at
FROM user_cycles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com');

-- 5. SAMPLE DOS SEUS TÓPICOS COM PROGRESSO
SELECT 
  'SEUS TÓPICOS COM PROGRESSO' as info,
  t.id,
  t.subject_id,
  s.name as materia_nome,
  t.completed,
  t.review_stage,
  pg_typeof(t.subject_id) as tipo_subject_id,
  pg_typeof(s.id) as tipo_subject_s_id
FROM topics t
JOIN subjects s ON t.subject_id = s.id
WHERE s.user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com')
  AND (t.completed = true OR t.review_stage = 'Concluído')
LIMIT 10;

-- 6. CONTAGEM DE PROGRESSO POR MATÉRIA
SELECT 
  'PROGRESSO POR MATÉRIA' as info,
  s.id as subject_id,
  s.name as materia,
  COUNT(t.id) as total_topicos,
  COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) as topicos_concluidos,
  pg_typeof(s.id) as tipo_subject_id
FROM subjects s
LEFT JOIN topics t ON t.subject_id = s.id
WHERE s.user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com')
GROUP BY s.id, s.name
ORDER BY topicos_concluidos DESC;

-- 7. VERIFICAR TIPOS DE DADOS DOS ARRAYS
SELECT 
  'TIPOS DE ARRAYS' as info,
  pg_typeof(ciclo_atual) as tipo_ciclo_atual,
  pg_typeof(materias_estudadas_ciclo) as tipo_materias_estudadas,
  ciclo_atual[1] as primeiro_item_ciclo,
  pg_typeof(ciclo_atual[1]) as tipo_primeiro_item_ciclo,
  CASE 
    WHEN materias_estudadas_ciclo IS NOT NULL AND array_length(materias_estudadas_ciclo, 1) > 0 
    THEN materias_estudadas_ciclo[1] 
    ELSE NULL 
  END as primeiro_item_estudadas,
  CASE 
    WHEN materias_estudadas_ciclo IS NOT NULL AND array_length(materias_estudadas_ciclo, 1) > 0 
    THEN pg_typeof(materias_estudadas_ciclo[1])
    ELSE NULL 
  END as tipo_primeiro_item_estudadas
FROM user_cycles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com');