-- ========================================
-- SCRIPT PARA CORRIGIR ESTATÍSTICAS DE PRODUÇÃO
-- ========================================

-- 1. Primeiro, vamos identificar o user_id correto
-- (Execute este bloco primeiro para confirmar o user_id)
SELECT 
  user_id,
  COUNT(*) as total_subjects,
  array_agg(name ORDER BY name) as subject_names
FROM subjects 
GROUP BY user_id;

-- 2. Verificar estado atual das matérias com progresso
-- (Substitua 'SEU_USER_ID' pelo user_id encontrado acima)
WITH subject_progress AS (
  SELECT 
    s.id,
    s.name,
    s.status,
    s.user_id,
    COUNT(t.id) as total_topics,
    COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) as completed_topics,
    ROUND(
      (COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END)::float / 
       NULLIF(COUNT(t.id), 0)) * 100, 2
    ) as progress_percent
  FROM subjects s
  LEFT JOIN topics t ON s.id = t.subject_id
  WHERE s.user_id = 'SEU_USER_ID'  -- SUBSTITUA AQUI
  GROUP BY s.id, s.name, s.status, s.user_id
)
SELECT 
  *,
  CASE 
    WHEN progress_percent > 0 THEN 'TEM_PROGRESSO'
    ELSE 'SEM_PROGRESSO'
  END as status_progresso
FROM subject_progress
ORDER BY progress_percent DESC;

-- 3. Verificar estado atual do ciclo
SELECT 
  user_id,
  ciclos_realizados,
  ciclo_atual,
  materias_estudadas_ciclo,
  array_length(ciclo_atual, 1) as total_materias_no_ciclo,
  array_length(materias_estudadas_ciclo, 1) as total_materias_estudadas,
  created_at,
  updated_at
FROM user_cycles 
WHERE user_id = 'SEU_USER_ID';  -- SUBSTITUA AQUI

-- ========================================
-- CORREÇÕES AUTOMÁTICAS
-- ========================================

-- 4. Atualizar o array materias_estudadas_ciclo com base no progresso real
-- (Execute após confirmar os dados acima)
UPDATE user_cycles 
SET 
  materias_estudadas_ciclo = (
    SELECT array_agg(DISTINCT s.id ORDER BY s.id)
    FROM subjects s
    LEFT JOIN topics t ON s.id = t.subject_id
    WHERE s.user_id = user_cycles.user_id
      AND s.id = ANY(ciclo_atual)  -- Apenas matérias do ciclo atual
    GROUP BY s.id
    HAVING COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) > 0
  ),
  updated_at = NOW()
WHERE user_id = 'SEU_USER_ID';  -- SUBSTITUA AQUI

-- 5. Verificar se a correção funcionou
SELECT 
  'APÓS CORREÇÃO' as status,
  user_id,
  ciclos_realizados,
  array_length(ciclo_atual, 1) as total_no_ciclo,
  array_length(materias_estudadas_ciclo, 1) as materias_estudadas_count,
  materias_estudadas_ciclo
FROM user_cycles 
WHERE user_id = 'SEU_USER_ID';  -- SUBSTITUA AQUI

-- 6. Verificar estatísticas finais por matéria
WITH final_stats AS (
  SELECT 
    s.id,
    s.name,
    COUNT(t.id) as total_topics,
    COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) as completed_topics,
    ROUND(
      (COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END)::float / 
       NULLIF(COUNT(t.id), 0)) * 100, 2
    ) as progress_percent,
    CASE WHEN s.id = ANY(
      SELECT materias_estudadas_ciclo FROM user_cycles WHERE user_id = s.user_id
    ) THEN 'SIM' ELSE 'NÃO' END as esta_em_estudadas
  FROM subjects s
  LEFT JOIN topics t ON s.id = t.subject_id
  WHERE s.user_id = 'SEU_USER_ID'  -- SUBSTITUA AQUI
  GROUP BY s.id, s.name, s.user_id
)
SELECT 
  name as materia,
  progress_percent as progresso,
  completed_topics as topicos_concluidos,
  total_topics as total_topicos,
  esta_em_estudadas as contabilizada_como_estudada
FROM final_stats
WHERE progress_percent > 0
ORDER BY progress_percent DESC;

-- ========================================
-- SCRIPT ALTERNATIVO MAIS AGRESSIVO
-- (Use apenas se o script acima não resolver)
-- ========================================

-- 7. Reconstruir completamente o array materias_estudadas_ciclo
-- CUIDADO: Este comando vai recriar o array baseado em QUALQUER progresso
/*
UPDATE user_cycles 
SET 
  materias_estudadas_ciclo = (
    WITH materias_com_progresso AS (
      SELECT DISTINCT s.id
      FROM subjects s
      LEFT JOIN topics t ON s.id = t.subject_id
      WHERE s.user_id = user_cycles.user_id
        AND s.id = ANY(ciclo_atual)
      GROUP BY s.id
      HAVING COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) > 0
    )
    SELECT array_agg(id ORDER BY id) FROM materias_com_progresso
  ),
  updated_at = NOW()
WHERE user_id = 'SEU_USER_ID';  -- SUBSTITUA AQUI
*/

-- ========================================
-- VERIFICAÇÃO FINAL COMPLETA
-- ========================================

-- 8. Relatório final completo
SELECT 
  '=== RELATÓRIO FINAL ===' as titulo,
  (SELECT COUNT(*) FROM subjects WHERE user_id = 'SEU_USER_ID') as total_materias,
  (SELECT array_length(ciclo_atual, 1) FROM user_cycles WHERE user_id = 'SEU_USER_ID') as materias_no_ciclo,
  (SELECT array_length(materias_estudadas_ciclo, 1) FROM user_cycles WHERE user_id = 'SEU_USER_ID') as materias_estudadas,
  (SELECT COUNT(DISTINCT s.id) 
   FROM subjects s 
   LEFT JOIN topics t ON s.id = t.subject_id 
   WHERE s.user_id = 'SEU_USER_ID' 
   GROUP BY s.user_id
   HAVING COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) > 0
  ) as materias_com_progresso_real;