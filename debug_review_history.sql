-- Query para debugar o histórico de revisões

-- 1. Ver quantos registros foram criados
SELECT COUNT(*) as total_registros FROM public.topic_review_history;

-- 2. Ver registros por review_stage
SELECT review_stage, COUNT(*) as quantidade 
FROM public.topic_review_history 
GROUP BY review_stage 
ORDER BY review_stage;

-- 3. Ver um exemplo de tópico específico (substitua o ID)
SELECT 
  t.id,
  t.name,
  t.review_stage as current_stage,
  t.first_studied_at,
  t.last_reviewed_at,
  (
    SELECT json_agg(
      json_build_object(
        'stage', trh.review_stage,
        'reviewed_at', trh.reviewed_at
      ) ORDER BY trh.reviewed_at
    )
    FROM public.topic_review_history trh
    WHERE trh.topic_id = t.id
  ) as history
FROM public.topics t
WHERE t.review_stage IS NOT NULL
  AND t.review_stage != ''
LIMIT 5;

-- 4. Ver tópicos que deveriam ter histórico mas não têm
SELECT 
  t.id,
  t.name,
  t.review_stage,
  t.first_studied_at,
  COUNT(trh.id) as history_count
FROM public.topics t
LEFT JOIN public.topic_review_history trh ON trh.topic_id = t.id
WHERE t.review_stage IS NOT NULL
  AND t.review_stage != ''
  AND t.first_studied_at IS NOT NULL
GROUP BY t.id, t.name, t.review_stage, t.first_studied_at
HAVING COUNT(trh.id) = 0;
