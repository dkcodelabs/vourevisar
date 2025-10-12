-- ========================================
-- CORREÇÃO ESPECÍFICA PARA darciliok@gmail.com
-- ========================================

-- 1. VERIFICAR SEU USER_ID
SELECT 
  id as user_id,
  email
FROM auth.users 
WHERE email = 'darciliok@gmail.com';

-- 2. VERIFICAR SUAS MATÉRIAS COM PROGRESSO ATUAL
SELECT 
  s.id,
  s.name as materia,
  COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) as topicos_concluidos,
  COUNT(t.id) as total_topicos
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.user_id = (SELECT id FROM auth.users WHERE email = 'darciliok@gmail.com')
GROUP BY s.id, s.name
HAVING COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) > 0
ORDER BY topicos_concluidos DESC;

-- 3. VER ESTADO ATUAL DO SEU CICLO
SELECT 
  ciclos_realizados,
  array_length(ciclo_atual, 1) as total_materias_ciclo,
  array_length(materias_estudadas_ciclo, 1) as materias_estudadas_atual,
  materias_estudadas_ciclo,
  ciclo_atual
FROM user_cycles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'darciliok@gmail.com');

-- ========================================
-- CORREÇÃO PRINCIPAL
-- ========================================

-- 4. CORRIGIR SUAS ESTATÍSTICAS
UPDATE user_cycles 
SET 
  materias_estudadas_ciclo = (
    SELECT array_agg(s.id::text ORDER BY s.id)
    FROM subjects s
    LEFT JOIN topics t ON s.id = t.subject_id
    WHERE s.user_id = (SELECT id FROM auth.users WHERE email = 'darciliok@gmail.com')
      AND s.id::text = ANY(ciclo_atual)  -- Cast UUID para text
    GROUP BY s.id
    HAVING COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) > 0
  ),
  updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'darciliok@gmail.com');

-- 5. VERIFICAR SE A CORREÇÃO FUNCIONOU
SELECT 
  'APÓS CORREÇÃO' as status,
  ciclos_realizados,
  array_length(ciclo_atual, 1) as total_materias_ciclo,
  array_length(materias_estudadas_ciclo, 1) as materias_estudadas_agora,
  materias_estudadas_ciclo
FROM user_cycles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'darciliok@gmail.com');

-- 6. VERIFICAR RESULTADO FINAL POR MATÉRIA
SELECT 
  s.name as materia,
  COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) as topicos_concluidos,
  COUNT(t.id) as total_topicos,
  CASE WHEN s.id::text = ANY(
    SELECT materias_estudadas_ciclo 
    FROM user_cycles 
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'darciliok@gmail.com')
  ) THEN '✅ CONTABILIZADA' ELSE '❌ NÃO CONTABILIZADA' END as status_final
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.user_id = (SELECT id FROM auth.users WHERE email = 'darciliok@gmail.com')
  AND s.id::text = ANY((
    SELECT ciclo_atual 
    FROM user_cycles 
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'darciliok@gmail.com')
  ))
GROUP BY s.id, s.name
HAVING COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) > 0
ORDER BY topicos_concluidos DESC;