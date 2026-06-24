
-- Verificar e corrigir inconsistências nos dados de next_review
-- Garantir que tópicos concluídos sem revisões futuras tenham next_review como NULL

UPDATE topics 
SET next_review = NULL 
WHERE (review_stage = 'Concluído' OR completed = true) 
AND next_review IS NOT NULL;

-- Verificar a consistência dos dados após a correção
-- Esta query não faz alterações, apenas verifica o estado atual
SELECT 
  t.name as topic_name,
  s.name as subject_name,
  t.completed,
  t.review_stage,
  t.next_review,
  CASE 
    WHEN (t.review_stage = 'Concluído' OR t.completed = true) AND t.next_review IS NULL THEN 'Dominado'
    WHEN (t.review_stage = 'Concluído' OR t.completed = true) AND t.next_review IS NOT NULL THEN 'Concluído com revisão'
    ELSE 'Em progresso'
  END as status_categoria
FROM topics t
JOIN subjects s ON t.subject_id = s.id
ORDER BY s.name, t.name;
;
