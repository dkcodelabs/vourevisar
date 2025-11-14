-- ============================================
-- MIGRAÇÃO: Corrigir entradas duplicadas no histórico
-- Data: 2025-01-14
-- Descrição: Remove entradas de revisão que foram registradas incorretamente
-- ============================================

-- Remover entradas de revisão 24h que têm a mesma data/hora do primeiro contato
-- (isso indica que foram registradas incorretamente no mesmo momento)
DELETE FROM topic_review_history trh1
WHERE trh1.review_stage = '24h'
  AND EXISTS (
    SELECT 1 
    FROM topic_review_history trh2
    WHERE trh2.topic_id = trh1.topic_id
      AND trh2.review_stage = 'Primeiro Contato'
      AND ABS(EXTRACT(EPOCH FROM (trh1.reviewed_at - trh2.reviewed_at))) < 5 -- Menos de 5 segundos de diferença
  );

-- Remover entradas duplicadas (mesma revisão registrada múltiplas vezes)
-- Manter apenas a primeira entrada de cada combinação topic_id + review_stage
DELETE FROM topic_review_history trh1
WHERE trh1.id NOT IN (
  SELECT DISTINCT ON (topic_id, review_stage) id
  FROM topic_review_history
  ORDER BY topic_id, review_stage, reviewed_at ASC
);

-- Log para debug
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'Removidas % entradas duplicadas do histórico', affected_count;
END $$;

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================
