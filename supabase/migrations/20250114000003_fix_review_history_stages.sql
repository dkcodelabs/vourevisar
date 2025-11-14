-- Fix: Corrigir histórico de revisões para refletir revisões FEITAS, não agendadas
-- Problema: A migration anterior criava histórico baseado em review_stage como "próxima revisão"
-- Mas o sistema usa review_stage como "última revisão feita"

-- Limpar histórico incorreto (exceto primeiro contato)
DELETE FROM public.topic_review_history 
WHERE review_stage != 'Primeiro Contato';

-- Função auxiliar para determinar quais estágios já foram COMPLETADOS
-- IMPORTANTE: Agora review_stage indica a ÚLTIMA revisão FEITA
CREATE OR REPLACE FUNCTION get_completed_review_stages(current_stage TEXT, review_count INTEGER)
RETURNS TEXT[] AS $$
BEGIN
  -- Se review_count = 0, nenhuma revisão foi feita
  IF review_count = 0 THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  -- Se review_count = 1, apenas primeiro contato foi feito
  IF review_count = 1 THEN
    RETURN ARRAY[]::TEXT[]; -- Primeiro contato não vai para o histórico de revisões
  END IF;

  -- Se review_count >= 2, temos revisões completadas
  -- review_count = 2 → completou revisão 24h
  -- review_count = 3 → completou revisões 24h e 7d
  -- review_count = 4 → completou revisões 24h, 7d e 15d
  -- review_count = 5 → completou revisões 24h, 7d, 15d e 30d

  CASE review_count
    WHEN 2 THEN
      RETURN ARRAY['24h'];
    WHEN 3 THEN
      RETURN ARRAY['24h', '7d'];
    WHEN 4 THEN
      RETURN ARRAY['24h', '7d', '15d'];
    WHEN 5 THEN
      RETURN ARRAY['24h', '7d', '15d', '30d'];
    ELSE
      -- Se review_count > 5, todas as revisões foram completadas
      RETURN ARRAY['24h', '7d', '15d', '30d'];
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Inserir histórico correto baseado em review_count
WITH topic_data AS (
  SELECT 
    id as topic_id,
    review_count,
    first_studied_at,
    last_reviewed_at,
    get_completed_review_stages(review_stage, review_count) as completed_stages
  FROM public.topics
  WHERE review_count >= 2  -- Apenas tópicos que têm revisões completadas
    AND first_studied_at IS NOT NULL
)
INSERT INTO public.topic_review_history (topic_id, review_stage, reviewed_at)
SELECT 
  td.topic_id,
  stage_data.stage,
  stage_data.estimated_reviewed_at as reviewed_at
FROM topic_data td
CROSS JOIN LATERAL (
  SELECT 
    stage,
    CASE stage
      WHEN '24h' THEN td.first_studied_at + INTERVAL '1 day'
      WHEN '7d' THEN td.first_studied_at + INTERVAL '8 days'
      WHEN '15d' THEN td.first_studied_at + INTERVAL '16 days'
      WHEN '30d' THEN td.first_studied_at + INTERVAL '31 days'
    END as estimated_reviewed_at
  FROM unnest(td.completed_stages) as stage
) stage_data
WHERE stage_data.estimated_reviewed_at IS NOT NULL
  -- Evitar duplicatas verificando se já existe
  AND NOT EXISTS (
    SELECT 1 FROM public.topic_review_history trh
    WHERE trh.topic_id = td.topic_id
      AND trh.review_stage = stage_data.stage
  );

-- Limpar função auxiliar
DROP FUNCTION IF EXISTS get_completed_review_stages(TEXT, INTEGER);

-- Verificar resultados
DO $$
DECLARE
  total_entries INTEGER;
  topics_with_history INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_entries FROM public.topic_review_history WHERE review_stage != 'Primeiro Contato';
  SELECT COUNT(DISTINCT topic_id) INTO topics_with_history FROM public.topic_review_history WHERE review_stage != 'Primeiro Contato';
  
  RAISE NOTICE 'Correção do histórico concluída:';
  RAISE NOTICE '  - Total de revisões no histórico: %', total_entries;
  RAISE NOTICE '  - Tópicos com revisões: %', topics_with_history;
END $$;
