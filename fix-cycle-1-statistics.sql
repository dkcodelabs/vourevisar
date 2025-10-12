-- ========================================
-- CORREÇÃO ESPECÍFICA PARA CICLO 1 - 3 MATÉRIAS ESTUDADAS
-- ========================================

-- PASSO 1: Encontrar seu user_id
SELECT user_id, COUNT(*) as total_subjects 
FROM subjects 
GROUP BY user_id 
ORDER BY total_subjects DESC;

-- PASSO 2: Verificar matérias com progresso atual
-- (Substitua 'SEU_USER_ID' pelo resultado do PASSO 1)
WITH materias_progresso AS (
  SELECT 
    s.id,
    s.name,
    COUNT(t.id) as total_topics,
    COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) as completed_topics,
    ROUND(
      (COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END)::float / 
       NULLIF(COUNT(t.id), 0)) * 100, 2
    ) as progress_percent
  FROM subjects s
  LEFT JOIN topics t ON s.id = t.subject_id
  WHERE s.user_id = 'SEU_USER_ID'  -- SUBSTITUA AQUI
  GROUP BY s.id, s.name
  HAVING COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) > 0
)
SELECT 
  id,
  name as materia,
  progress_percent as progresso,
  completed_topics as topicos_concluidos,
  total_topics as total_topicos
FROM materias_progresso
ORDER BY progress_percent DESC;

-- PASSO 3: Verificar estado atual do ciclo
SELECT 
  ciclos_realizados,
  array_length(ciclo_atual, 1) as total_materias_ciclo,
  array_length(materias_estudadas_ciclo, 1) as materias_estudadas_count,
  ciclo_atual,
  materias_estudadas_ciclo
FROM user_cycles 
WHERE user_id = 'SEU_USER_ID';  -- SUBSTITUA AQUI

-- ========================================
-- CORREÇÃO AUTOMÁTICA
-- ========================================

-- PASSO 4: Corrigir o contador de matérias estudadas
-- Esta query vai identificar automaticamente as 3 matérias com progresso
UPDATE user_cycles 
SET 
  materias_estudadas_ciclo = (
    WITH materias_com_progresso AS (
      SELECT s.id
      FROM subjects s
      LEFT JOIN topics t ON s.id = t.subject_id
      WHERE s.user_id = user_cycles.user_id
        AND s.id = ANY(ciclo_atual)  -- Apenas matérias do ciclo atual
      GROUP BY s.id
      HAVING COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) > 0
      ORDER BY COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) DESC
    )
    SELECT array_agg(id) FROM materias_com_progresso
  ),
  updated_at = NOW()
WHERE user_id = 'SEU_USER_ID';  -- SUBSTITUA AQUI

-- PASSO 5: Verificar se a correção funcionou
SELECT 
  'RESULTADO FINAL' as status,
  ciclos_realizados,
  array_length(ciclo_atual, 1) as total_materias_ciclo,
  array_length(materias_estudadas_ciclo, 1) as materias_estudadas_agora,
  materias_estudadas_ciclo
FROM user_cycles 
WHERE user_id = 'SEU_USER_ID';  -- SUBSTITUA AQUI

-- PASSO 6: Verificar quais matérias estão sendo contabilizadas
SELECT 
  s.name as materia,
  ROUND(
    (COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END)::float / 
     NULLIF(COUNT(t.id), 0)) * 100, 2
  ) as progresso,
  CASE WHEN s.id = ANY(
    SELECT materias_estudadas_ciclo FROM user_cycles WHERE user_id = s.user_id
  ) THEN '✅ CONTABILIZADA' ELSE '❌ NÃO CONTABILIZADA' END as status
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.user_id = 'SEU_USER_ID'  -- SUBSTITUA AQUI
  AND s.id = ANY((SELECT ciclo_atual FROM user_cycles WHERE user_id = s.user_id))
GROUP BY s.id, s.name, s.user_id
HAVING COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) > 0
ORDER BY progresso DESC;

-- ========================================
-- SCRIPT DE EMERGÊNCIA (se ainda não funcionar)
-- ========================================

-- PASSO 7: Forçar atualização manual (descomente se necessário)
/*
-- Se você souber exatamente quais são as 3 matérias, pode forçar manualmente:
-- Primeiro, veja os IDs das matérias:
SELECT id, name FROM subjects WHERE user_id = 'SEU_USER_ID' ORDER BY name;

-- Depois force a atualização (substitua os IDs pelos corretos):
UPDATE user_cycles 
SET 
  materias_estudadas_ciclo = ARRAY[ID1, ID2, ID3],  -- Substitua pelos IDs corretos
  updated_at = NOW()
WHERE user_id = 'SEU_USER_ID';
*/