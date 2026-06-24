-- ============================================================================
-- MIGRAÇÃO: Otimizações Seguras de Índices
-- Data: 2026-01-17
-- Descrição: Remove índice duplicado e adiciona índice faltante
-- ============================================================================

-- ============================================================================
-- PARTE 1: REMOVER ÍNDICE DUPLICADO
-- ============================================================================

-- Topics tem dois índices idênticos: idx_topics_difficulty e idx_topics_difficulty_level
-- Mantemos idx_topics_difficulty (criado na migração anterior) e removemos o antigo
DROP INDEX IF EXISTS idx_topics_difficulty_level;

COMMENT ON INDEX idx_topics_difficulty IS 'Índice para queries filtradas por nível de dificuldade (duplicata removida)';

-- ============================================================================
-- PARTE 2: ADICIONAR ÍNDICE FALTANTE
-- ============================================================================

-- Study Sessions: subject_id é foreign key sem índice cobrindo
-- Útil para queries que filtram sessões por matéria
CREATE INDEX IF NOT EXISTS idx_study_sessions_subject_id 
    ON public.study_sessions(subject_id);

COMMENT ON INDEX idx_study_sessions_subject_id IS 'Otimiza queries de sessões de estudo filtradas por matéria';

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================;
