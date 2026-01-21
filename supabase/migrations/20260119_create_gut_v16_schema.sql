-- Migration: GUT Calculator v16 - Cache Global e Histórico de Tendências
-- Created: 2026-01-19
-- Description: Adiciona tabelas para cache de termos e histórico de tendências para BI

-- =============================================
-- TABELA 1: Cache Global de Termos
-- =============================================
-- Armazena volumes de busca com TTL de 30 dias
-- Reduz chamadas à API do Google Custom Search

CREATE TABLE IF NOT EXISTS public.global_term_cache (
    term_hash TEXT PRIMARY KEY,
    termo_limpo TEXT NOT NULL,
    materia TEXT NOT NULL,
    volume INTEGER NOT NULL DEFAULT 0,
    last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para otimizar queries
CREATE INDEX idx_global_term_cache_materia ON public.global_term_cache(materia);
CREATE INDEX idx_global_term_cache_last_updated ON public.global_term_cache(last_updated_at);
CREATE INDEX idx_global_term_cache_termo_materia ON public.global_term_cache(termo_limpo, materia);

-- Comentários
COMMENT ON TABLE public.global_term_cache IS 'Cache global de volumes de busca (compartilhado entre usuários) com validade de 30 dias';
COMMENT ON COLUMN public.global_term_cache.term_hash IS 'Hash MD5 único do termo+matéria para lookup rápido';
COMMENT ON COLUMN public.global_term_cache.termo_limpo IS 'Termo normalizado exato';
COMMENT ON COLUMN public.global_term_cache.materia IS 'Contexto da matéria para filtro';
COMMENT ON COLUMN public.global_term_cache.volume IS 'Último volume encontrado no Google Custom Search';
COMMENT ON COLUMN public.global_term_cache.last_updated_at IS 'Data da última atualização (usado para TTL de 30 dias)';

-- =============================================
-- TABELA 2: Histórico de Tendências
-- =============================================
-- Snapshots de cada cálculo para análise temporal e gráficos

CREATE TABLE IF NOT EXISTS public.topic_trend_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    topic_id UUID,  -- Referência opcional ao tópico do sistema (se existir)
    materia TEXT NOT NULL,
    topico_original TEXT NOT NULL,
    sub_term TEXT NOT NULL,
    volume INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL CHECK (source IN ('CACHE', 'API')),
    nota_gut INTEGER CHECK (nota_gut BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para queries analíticas
CREATE INDEX idx_topic_trend_history_user_id ON public.topic_trend_history(user_id);
CREATE INDEX idx_topic_trend_history_materia ON public.topic_trend_history(materia);
CREATE INDEX idx_topic_trend_history_sub_term ON public.topic_trend_history(sub_term);
CREATE INDEX idx_topic_trend_history_created_at ON public.topic_trend_history(created_at DESC);
CREATE INDEX idx_topic_trend_history_sub_term_created ON public.topic_trend_history(sub_term, created_at DESC);

-- Comentários
COMMENT ON TABLE public.topic_trend_history IS 'Histórico completo de cálculos GUT para análises temporais e gráficos';
COMMENT ON COLUMN public.topic_trend_history.source IS 'Origem do dado: CACHE (reutilizado) ou API (busca nova)';
COMMENT ON COLUMN public.topic_trend_history.nota_gut IS 'Nota GUT calculada (1-5)';
COMMENT ON COLUMN public.topic_trend_history.topico_original IS 'Input original do usuário antes da normalização';

-- =============================================
-- RLS (Row Level Security)
-- =============================================
-- Habilita RLS mas permite leitura pública do cache

ALTER TABLE public.global_term_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_trend_history ENABLE ROW LEVEL SECURITY;

-- Cache: Todos podem ler, apenas sistema pode escrever
CREATE POLICY "Cache é público para leitura" ON public.global_term_cache
    FOR SELECT USING (true);

CREATE POLICY "Apenas sistema atualiza cache" ON public.global_term_cache
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Apenas sistema atualiza cache existente" ON public.global_term_cache
    FOR UPDATE USING (true);

-- Histórico: Usuários veem apenas seus dados (ou todos se admin)
CREATE POLICY "Usuários veem próprio histórico" ON public.topic_trend_history
    FOR SELECT USING (
        auth.uid() = user_id OR user_id IS NULL
    );

CREATE POLICY "Sistema salva histórico" ON public.topic_trend_history
    FOR INSERT WITH CHECK (true);

-- =============================================
-- FUNÇÃO: Limpar Cache Expirado (Manutenção)
-- =============================================
-- Executar via cron job ou manualmente para limpar dados > 30 dias

CREATE OR REPLACE FUNCTION clean_expired_cache(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.global_term_cache
    WHERE last_updated_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION clean_expired_cache IS 'Remove entradas do cache mais antigas que X dias (padrão: 30)';

-- =============================================
-- VIEW: Estatísticas de Cache (Monitoramento)
-- =============================================

CREATE OR REPLACE VIEW public.cache_stats AS
SELECT 
    COUNT(*) as total_entries,
    COUNT(DISTINCT materia) as unique_subjects,
    COUNT(*) FILTER (WHERE last_updated_at > NOW() - INTERVAL '7 days') as entries_last_week,
    COUNT(*) FILTER (WHERE last_updated_at > NOW() - INTERVAL '30 days') as entries_last_month,
    MAX(last_updated_at) as most_recent_update,
    MIN(last_updated_at) as oldest_entry
FROM public.global_term_cache;

COMMENT ON VIEW public.cache_stats IS 'Dashboard rápido de estatísticas do cache';
