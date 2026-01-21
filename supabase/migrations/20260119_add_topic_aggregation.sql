-- Migration: GUT Calculator v16.5 - Agregação de Volume
-- Created: 2026-01-19
-- Description: Adiciona suporte para agregação de volumes (soma de sub-tópicos)

-- =============================================
-- ADICIONAR CAMPO PARA VOLUME TOTAL AGREGADO
-- =============================================

ALTER TABLE public.topic_trend_history
ADD COLUMN IF NOT EXISTS total_topic_volume INTEGER;

COMMENT ON COLUMN public.topic_trend_history.total_topic_volume 
IS 'Volume total do tópico principal (soma dos sub-termos). NULL para registros individuais, preenchido apenas para registros com source=AGGREGATED';

-- =============================================
-- ÍNDICE PARA QUERIES DE AGREGAÇÃO
-- =============================================

CREATE INDEX IF NOT EXISTS idx_topic_trend_history_aggregate 
ON public.topic_trend_history(topico_original, source) 
WHERE source = 'AGGREGATED';

COMMENT ON INDEX idx_topic_trend_history_aggregate 
IS 'Índice para facilitar queries de registros agregados (soma de volumes)';

-- =============================================
-- VIEW: Últimos Processamentos (Para UI de Automação)
-- =============================================

CREATE OR REPLACE VIEW public.recent_trend_calculations AS
SELECT 
    id,
    created_at,
    topico_original,
    materia,
    total_topic_volume as volume_total,
    (
        SELECT sub_term 
        FROM topic_trend_history h2 
        WHERE h2.topico_original = h1.topico_original 
        AND h2.source != 'AGGREGATED'
        ORDER BY h2.volume DESC 
        LIMIT 1
    ) as maior_sub_topico,
    source
FROM public.topic_trend_history h1
WHERE source = 'AGGREGATED'
ORDER BY created_at DESC
LIMIT 20;

COMMENT ON VIEW public.recent_trend_calculations 
IS 'Últimos 20 cálculos de tendência processados (para UI de automação)';

-- =============================================
-- FUNÇÃO: Buscar Volume Agregado de um Tópico
-- =============================================

CREATE OR REPLACE FUNCTION get_topic_aggregate_volume(topic_name TEXT)
RETURNS INTEGER AS $$
DECLARE
    agg_volume INTEGER;
BEGIN
    SELECT total_topic_volume 
    INTO agg_volume
    FROM public.topic_trend_history
    WHERE topico_original = topic_name
    AND source = 'AGGREGATED'
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN COALESCE(agg_volume, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_topic_aggregate_volume 
IS 'Retorna o volume total mais recente de um tópico (soma dos sub-termos)';
