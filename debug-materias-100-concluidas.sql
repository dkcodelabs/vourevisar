-- Verificar quais matérias estão 100% concluídas
WITH materia_progress AS (
  SELECT 
    s.id,
    s.name,
    s.status,
    COUNT(t.id) as total_topics,
    COUNT(CASE WHEN t.completed = true THEN 1 END) as completed_topics,
    COUNT(CASE WHEN t.review_stage = 'Concluído' THEN 1 END) as concluded_topics,
    COUNT(CASE WHEN t.review_stage = '30d' THEN 1 END) as stage_30d_topics,
    COUNT(CASE WHEN t.review_stage = '60d' THEN 1 END) as stage_60d_topics,
    COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' OR t.review_stage = '60d' THEN 1 END) as considered_completed,
    ROUND(
      (COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' OR t.review_stage = '60d' THEN 1 END)::float / 
       NULLIF(COUNT(t.id), 0)) * 100, 2
    ) as progress_percent
  FROM subjects s
  LEFT JOIN topics t ON s.id = t.subject_id
  WHERE s.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
  GROUP BY s.id, s.name, s.status
)
SELECT 
  *,
  CASE 
    WHEN progress_percent >= 100 THEN 'SIM - 100% CONCLUÍDA'
    ELSE 'NÃO - AINDA ATIVA'
  END as is_100_completed
FROM materia_progress
ORDER BY name;

-- Ver ciclo atual
SELECT 
  'CICLO ATUAL' as info,
  ciclos_realizados,
  ciclo_atual,
  array_length(ciclo_atual, 1) as total_no_ciclo
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';