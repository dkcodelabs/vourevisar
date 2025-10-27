-- ========================================
-- VERIFICAÇÃO PARA USUÁRIO darciliok@gmail.com
-- ========================================

-- 1. ENCONTRAR SEU USER_ID PELO EMAIL
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users 
WHERE email = 'darciliok@gmail.com';

-- 2. VERIFICAR SE VOCÊ TEM MATÉRIAS CADASTRADAS
SELECT 
  COUNT(*) as total_materias,
  user_id
FROM subjects 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'darciliok@gmail.com'
);

-- 3. VERIFICAR SE VOCÊ TEM CICLO CONFIGURADO
SELECT 
  user_id,
  ciclos_realizados,
  array_length(ciclo_atual, 1) as materias_no_ciclo,
  array_length(materias_estudadas_ciclo, 1) as materias_estudadas
FROM user_cycles 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'darciliok@gmail.com'
);

-- 4. VER SUAS MATÉRIAS COM PROGRESSO
SELECT 
  s.name as materia,
  COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) as topicos_concluidos,
  COUNT(t.id) as total_topicos
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.user_id = (
  SELECT id FROM auth.users WHERE email = 'darciliok@gmail.com'
)
GROUP BY s.id, s.name
HAVING COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) > 0
ORDER BY topicos_concluidos DESC;