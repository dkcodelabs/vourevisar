-- ============================================
-- MIGRAÇÃO: Corrigir tópicos marcados incorretamente como concluídos
-- Data: 2025-01-14
-- Descrição: Remove flag completed de tópicos que ainda têm revisões pendentes
-- ============================================

-- Corrigir tópicos marcados como concluídos mas que ainda não completaram todas as revisões
-- Um tópico só deve estar completed=true quando review_count > maxReviews do perfil

UPDATE topics
SET completed = false
WHERE completed = true
  AND review_count < 5; -- Considerando o máximo de revisões (BEGINNER = 6, então < 5 ainda tem revisões)

-- Log para debug
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'Corrigidos % tópicos marcados incorretamente como concluídos', affected_count;
END $$;

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================
