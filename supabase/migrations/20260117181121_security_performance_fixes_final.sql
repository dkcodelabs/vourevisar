-- ============================================================================
-- MIGRAÇÃO: Correções Essenciais de Segurança e Performance
-- Data: 2026-01-17
-- Descrição: Aplica correções críticas sem modificar políticas RLS existentes
-- ============================================================================

-- ============================================================================
-- PARTE 1: CORREÇÕES DE SEGURANÇA
-- ============================================================================

-- 1.1: Corrigir search_path em funções (previne schema poisoning)
-- ----------------------------------------------------------------------------
ALTER FUNCTION public.get_weighted_reviews(uuid, integer, integer) SET search_path = public;
ALTER FUNCTION public.register_topic_review() SET search_path = public;

-- 1.2: Ajustar políticas RLS permissivas (mantendo lógica existente)
-- ----------------------------------------------------------------------------

-- Audit Logs: Manter INSERT restrito mas com lógica mais segura
DROP POLICY IF EXISTS "System can insert logs" ON public.audit_logs;
CREATE POLICY "System can insert logs" ON public.audit_logs
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Notifications: Manter INSERT restrito mas com lógica mais segura  
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- PARTE 2: OTIMIZAÇÕES DE PERFORMANCE - ÍNDICES
-- ============================================================================

-- 2.1: Índices em Foreign Keys sem cobertura
-- ----------------------------------------------------------------------------

-- Subjects: user_id (queries de listagem por usuário)
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON public.subjects(user_id);

-- System Settings: updated_by (auditoria)
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by ON public.system_settings(updated_by);

-- User Roles: assigned_by (rastreamento)
CREATE INDEX IF NOT EXISTS idx_user_roles_assigned_by ON public.user_roles(assigned_by);

-- 2.2: Índices Compostos para Queries Comuns
-- ----------------------------------------------------------------------------

-- Topics: subject_id é muito usado em JOINs
CREATE INDEX IF NOT EXISTS idx_topics_subject_id_created ON public.topics(subject_id, created_at DESC);

-- Study Sessions: analytics por usuário e data
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_created ON public.study_sessions(user_id, created_at DESC);

-- Topic Review History: histórico por tópico e data
CREATE INDEX IF NOT EXISTS idx_topic_review_history_topic_reviewed 
    ON public.topic_review_history(topic_id, reviewed_at DESC);

-- Notifications: notificações não lidas por usuário (coluna 'read' é boolean)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
    ON public.notifications(user_id, read) 
    WHERE read = false;

-- Topics: queries de revisão (next_review não nulo)
CREATE INDEX IF NOT EXISTS idx_topics_next_review 
    ON public.topics(next_review) 
    WHERE next_review IS NOT NULL;

-- Topics: queries por dificuldade
CREATE INDEX IF NOT EXISTS idx_topics_difficulty 
    ON public.topics(difficulty_level) 
    WHERE difficulty_level IS NOT NULL;

-- Subjects: queries por status
CREATE INDEX IF NOT EXISTS idx_subjects_status 
    ON public.subjects(status, user_id);

-- ============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON INDEX idx_subjects_user_id IS 'Otimiza listagem de matérias por usuário';
COMMENT ON INDEX idx_topics_subject_id_created IS 'Otimiza queries de tópicos por matéria ordenados por data';
COMMENT ON INDEX idx_study_sessions_user_created IS 'Otimiza analytics de sessões de estudo';
COMMENT ON INDEX idx_notifications_user_unread IS 'Otimiza queries de notificações não lidas';
COMMENT ON INDEX idx_topics_next_review IS 'Otimiza queries de revisões pendentes';
COMMENT ON INDEX idx_topics_difficulty IS 'Otimiza queries filtradas por dificuldade';

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================;
