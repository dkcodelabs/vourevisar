-- ============================================
-- MIGRAÇÃO: Corrigir Histórico - Remover Estágios Futuros
-- Data: 2025-01-11
-- Descrição: Remove entradas do histórico que são do estágio atual ou futuro
-- ============================================

-- Deletar entradas que não deveriam estar no histórico
-- Se o tópico está em '30d', não deve ter entrada de '30d' no histórico
DELETE FROM public.topic_review_history trh
WHERE EXISTS (
  SELECT 1 FROM public.topics t
  WHERE t.id = trh.topic_id
  AND trh.review_stage = t.review_stage
  AND trh.review_stage != 'first_contact'
);

-- Deletar entradas de estágios futuros
-- Por exemplo, se está em '15d', não deve ter '30d' ou '60d' no histórico
DELETE FROM public.topic_review_history trh
WHERE trh.review_stage != 'first_contact'
AND EXISTS (
  SELECT 1 FROM public.topics t
  WHERE t.id = trh.topic_id
  AND (
    -- Se está em 24h, não deve ter 7d, 15d, 30d, 60d
    (t.review_stage IN ('24h', '1d') AND trh.review_stage IN ('7d', '15d', '30d', '60d'))
    OR
    -- Se está em 7d, não deve ter 15d, 30d, 60d
    (t.review_stage = '7d' AND trh.review_stage IN ('15d', '30d', '60d'))
    OR
    -- Se está em 15d, não deve ter 30d, 60d
    (t.review_stage = '15d' AND trh.review_stage IN ('30d', '60d'))
    OR
    -- Se está em 30d, não deve ter 60d
    (t.review_stage = '30d' AND trh.review_stage = '60d')
  )
);

-- Verificar resultados
DO $$
DECLARE
  total_entries INTEGER;
  topics_with_history INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_entries FROM public.topic_review_history;
  SELECT COUNT(DISTINCT topic_id) INTO topics_with_history FROM public.topic_review_history;
  
  RAISE NOTICE '✅ Limpeza concluída:';
  RAISE NOTICE '  - Total de entradas no histórico: %', total_entries;
  RAISE NOTICE '  - Tópicos com histórico: %', topics_with_history;
END $$;

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================
