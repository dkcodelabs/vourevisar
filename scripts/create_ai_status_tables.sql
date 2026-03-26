-- ============================================
-- Tabelas para Status e Histórico de Erros da IA
-- Execute este script no Supabase SQL Editor
-- ============================================

-- Tabela de status da IA
CREATE TABLE IF NOT EXISTS ai_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) DEFAULT 'unknown' CHECK (status IN ('active', 'inactive', 'error', 'unknown')),
  last_check TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de histórico de erros
CREATE TABLE IF NOT EXISTS ai_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_code VARCHAR(50),
  error_message TEXT,
  context TEXT, -- contexto adicional (ex: qual página/função)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir registro inicial de status
INSERT INTO ai_status (status, last_check, error_message)
VALUES ('unknown', NOW(), 'Status não verificado ainda')
ON CONFLICT DO NOTHING;

-- Habilitar RLS
ALTER TABLE ai_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_error_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (apenas admins podem modificar)
CREATE POLICY "Allow all access to ai_status" ON ai_status FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to ai_error_logs" ON ai_error_logs FOR ALL USING (true) WITH CHECK (true);
