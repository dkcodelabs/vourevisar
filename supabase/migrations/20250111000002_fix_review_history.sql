-- ============================================
-- MIGRAÇÃO: Corrigir Histórico de Revisões
-- Data: 2025-01-11
-- Descrição: Remove dados incorretos e reinsere corretamente
-- ============================================

-- 1. Limpar dados incorretos (manter apenas first_contact)
DELETE FROM public.topic_review_history 
WHERE review_stage != 'first_contact';

-- 2. Recriar função com lógica correta
-- IMPORTANTE: Retorna apenas os estágios ANTERIORES ao atual, não o atual
CREATE OR REPLACE FUNCTION get_completed_stages(current_stage TEXT)
RETURNS TEXT[] AS $$
BEGIN
  CASE current_stage
    WHEN '24h', '1d' THEN
      RETURN ARRAY[]::TEXT[]; -- Nenhuma revisão anterior
    WHEN '7d' THEN
      RETURN ARRAY['24h']; -- Apenas 24h foi completada
    WHEN '15d' THEN
      RETURN ARRAY['24h', '7d']; -- 24h e 7d foram completadas
    WHEN '30d' THEN
      RETURN ARRAY['24h', '7d', '15d']; -- 24h, 7d e 15d foram completadas
    WHEN '60d' THEN
      RETURN ARRAY['24h', '7d', '15d', '30d']; -- Todas exceto 60d
    WHEN 'completed', 'Concluído' THEN
      RETURN ARRAY['24h', '7d', '15d', '30d', '60d']; -- Todas completadas
    ELSE
      RETURN ARRAY[]::TEXT[];
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Reinserir dados corretos
WITH topic_stages AS (
  SELECT 
    id as topic_id,
    review_stage,
    first_studied_at,
    last_reviewed_at,
    get_completed_stages(review_stage) as completed_stages
  FROM public.topics
  WHERE review_stage IS NOT NULL
    AND review_stage != ''
    AND first_studied_at IS NOT NULL
)
INSERT INTO public.topic_review_history (topic_id, review_stage, reviewed_at)
SELECT 
  ts.topic_id,
  stage_data.stage,
  stage_data.estimated_reviewed_at
FROM topic_stages ts
CROSS JOIN LATERAL (
  SELECT 
    stage,
    CASE stage
      WHEN '24h' THEN ts.first_studied_at + INTERVAL '1 day'
      WHEN '7d' THEN ts.first_studied_at + INTERVAL '8 days'
      WHEN '15d' THEN ts.first_studied_at + INTERVAL '15 days'
      WHEN '30d' THEN ts.first_studied_at + INTERVAL '30 days'
      WHEN '60d' THEN ts.first_studied_at + INTERVAL '60 days'
    END as estimated_reviewed_at
  FROM unnest(ts.completed_stages) as stage
) stage_data
ON CONFLICT DO NOTHING;

-- 4. Limpar função auxiliar
DROP FUNCTION IF EXISTS get_completed_stages(TEXT);

-- 5. Verificar resultados
DO $$
DECLARE
  total_entries INTEGER;
  topics_with_history INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_entries FROM public.topic_review_history;
  SELECT COUNT(DISTINCT topic_id) INTO topics_with_history FROM public.topic_review_history;
  
  RAISE NOTICE '✅ Correção concluída:';
  RAISE NOTICE '  - Total de entradas no histórico: %', total_entries;
  RAISE NOTICE '  - Tópicos com histórico: %', topics_with_history;
END $$;

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================
