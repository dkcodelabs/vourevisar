-- =====================================================
-- MIGRATION: Create admin_error_events table
-- PURPOSE: Sistema de tratamento de erros user-friendly com observabilidade admin
-- DATE: 2026-02-09
-- =====================================================

-- 1. Criar tabela de eventos de erro
CREATE TABLE IF NOT EXISTS admin_error_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_id TEXT UNIQUE NOT NULL,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    user_message TEXT NOT NULL,
    technical_message TEXT NOT NULL,
    code TEXT,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    retryable BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'resolved', 'ignored')),
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_admin_error_events_error_id ON admin_error_events(error_id);
CREATE INDEX IF NOT EXISTS idx_admin_error_events_module ON admin_error_events(module);
CREATE INDEX IF NOT EXISTS idx_admin_error_events_severity ON admin_error_events(severity);
CREATE INDEX IF NOT EXISTS idx_admin_error_events_status ON admin_error_events(status);
CREATE INDEX IF NOT EXISTS idx_admin_error_events_created_at ON admin_error_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_error_events_actor_user_id ON admin_error_events(actor_user_id);

-- 3. Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_admin_error_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_error_events_updated_at
    BEFORE UPDATE ON admin_error_events
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_error_events_updated_at();

-- 4. Habilitar RLS
ALTER TABLE admin_error_events ENABLE ROW LEVEL SECURITY;

-- 5. Política de SELECT: Apenas Owner e Admin podem visualizar erros
CREATE POLICY "Only owners and admins can view errors"
    ON admin_error_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role IN ('owner', 'admin')
        )
    );

-- 6. Política de INSERT: Usuários autenticados podem criar logs de erro
-- (necessário para errorService.ts funcionar no client-side)
CREATE POLICY "Authenticated users can insert error logs"
    ON admin_error_events
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Política de UPDATE: Apenas Owner e Admin podem atualizar status
CREATE POLICY "Only owners and admins can update errors"
    ON admin_error_events
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role IN ('owner', 'admin')
        )
    );

-- 8. Comentários para documentação
COMMENT ON TABLE admin_error_events IS 'Tabela de logs de erros técnicos para observabilidade administrativa';
COMMENT ON COLUMN admin_error_events.error_id IS 'ID único do erro no formato ERR-YYYYMMDD-XXXX';
COMMENT ON COLUMN admin_error_events.module IS 'Módulo onde o erro ocorreu (users, auth, reviews, etc.)';
COMMENT ON COLUMN admin_error_events.action IS 'Ação que gerou o erro (update_user_status, create_review, etc.)';
COMMENT ON COLUMN admin_error_events.user_message IS 'Mensagem amigável exibida ao usuário';
COMMENT ON COLUMN admin_error_events.technical_message IS 'Mensagem técnica completa do erro';
COMMENT ON COLUMN admin_error_events.severity IS 'Nível de severidade: low, medium, high, critical';
COMMENT ON COLUMN admin_error_events.retryable IS 'Se a operação pode ser retentada pelo usuário';
COMMENT ON COLUMN admin_error_events.status IS 'Status do incidente: new, investigating, resolved, ignored';
COMMENT ON COLUMN admin_error_events.occurrence_count IS 'Número de vezes que o erro ocorreu (para deduplicação)';
COMMENT ON COLUMN admin_error_events.metadata IS 'Dados contextuais sanitizados (sem informações sensíveis)';
