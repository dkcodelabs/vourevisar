-- Fix: Corrigir tópicos com review_stage='Concluído' para o stage correto da última revisão
-- Problema: Tópicos completados têm review_stage='Concluído' mas deveriam ter '30d', '15d', etc.

-- Atualizar tópicos concluídos para ter o review_stage correto baseado no review_count
UPDATE topics
SET review_stage = CASE
  -- Se review_count = 5, última revisão foi 30d (intervals[3])
  WHEN review_count = 5 THEN '30d'
  -- Se review_count = 4, última revisão foi 15d (intervals[2])
  WHEN review_count = 4 THEN '15d'
  -- Se review_count = 3, última revisão foi 7d (intervals[1])
  WHEN review_count = 3 THEN '7d'
  -- Se review_count = 2, última revisão foi 24h (intervals[0])
  WHEN review_count = 2 THEN '24h'
  -- Caso contrário, manter como está
  ELSE review_stage
END
WHERE review_stage = 'Concluído'
  AND completed = true
  AND review_count >= 2;

-- Inserir registros faltantes no histórico para tópicos concluídos
-- Esses tópicos têm review_stage='Concluído' mas não têm o registro da última revisão no histórico

WITH completed_topics AS (
  SELECT 
    t.id as topic_id,
    t.review_count,
    t.review_stage,
    t.last_reviewed_at,
    t.first_studied_at
  FROM topics t
  WHERE t.completed = true
    AND t.review_count >= 2
    AND t.review_stage IN ('24h', '7d', '15d', '30d')  -- Agora tem o stage correto após o UPDATE acima
)
INSERT INTO topic_review_history (topic_id, review_stage, reviewed_at)
SELECT 
  ct.topic_id,
  ct.review_stage,
  COALESCE(ct.last_reviewed_at, NOW()) as reviewed_at
FROM completed_topics ct
WHERE NOT EXISTS (
  SELECT 1 
  FROM topic_review_history trh
  WHERE trh.topic_id = ct.topic_id
    AND trh.review_stage = ct.review_stage
);

-- Log das correções
DO $$
DECLARE
  updated_topics INTEGER;
  inserted_history INTEGER;
BEGIN
  -- Contar tópicos atualizados
  SELECT COUNT(*) INTO updated_topics
  FROM topics
  WHERE completed = true
    AND review_count >= 2
    AND review_stage IN ('24h', '7d', '15d', '30d');
  
  -- Contar registros de histórico inseridos
  SELECT COUNT(*) INTO inserted_history
  FROM topic_review_history
  WHERE review_stage IN ('24h', '7d', '15d', '30d')
    AND topic_id IN (
      SELECT id FROM topics WHERE completed = true
    );
  
  RAISE NOTICE 'Correção de tópicos concluídos:';
  RAISE NOTICE '  - Tópicos com review_stage corrigido: %', updated_topics;
  RAISE NOTICE '  - Registros no histórico: %', inserted_history;
END $$;
