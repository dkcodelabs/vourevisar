-- Fix: Corrigir tópicos que foram marcados com review_stage='24h' mas deveriam ser 'Primeiro Contato'
-- Problema: Tópicos com review_count=1 e review_stage='24h' que foram o primeiro contato

-- Corrigir tópicos que estão com review_stage='24h' mas review_count=1 (primeiro contato)
UPDATE topics
SET review_stage = 'Primeiro Contato'
WHERE review_count = 1
  AND review_stage = '24h'
  AND first_studied_at IS NOT NULL;

-- Log das correções
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'Corrigidos % tópicos de review_stage=24h para Primeiro Contato', affected_count;
END $$;
