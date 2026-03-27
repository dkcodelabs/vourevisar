-- Habilitar RLS na tabela admin_alert_events
ALTER TABLE admin_alert_events ENABLE ROW LEVEL SECURITY;

-- Política de SELECT: Apenas Owner e Admin podem visualizar alertas
CREATE POLICY "Only owners and admins can view alerts"
    ON admin_alert_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role IN ('owner', 'admin')
        )
    );

-- Política de INSERT: Usuários autenticados podem criar alertas
CREATE POLICY "Authenticated users can insert alerts"
    ON admin_alert_events
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Política de UPDATE: Apenas Owner e Admin podem atualizar status
CREATE POLICY "Only owners and admins can update alerts"
    ON admin_alert_events
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role IN ('owner', 'admin')
        )
    );

-- Comentários para documentação
COMMENT ON TABLE admin_alert_events IS 'Tabela de alertas operacionais para administradores';
