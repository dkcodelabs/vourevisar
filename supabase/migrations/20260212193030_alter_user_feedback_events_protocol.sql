
-- Migração 2: Adicionar protocol_code, admin_reply, e adaptar constraints

-- 1. Adicionar colunas
ALTER TABLE user_feedback_events
  ADD COLUMN IF NOT EXISTS protocol_code text,
  ADD COLUMN IF NOT EXISTS admin_reply text,
  ADD COLUMN IF NOT EXISTS admin_reply_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_reason text;

-- 2. Criar sequência para protocolo FBK-XXXXX
CREATE SEQUENCE IF NOT EXISTS feedback_protocol_seq START 10001;

-- 3. Função trigger que gera protocol_code automaticamente
CREATE OR REPLACE FUNCTION generate_feedback_protocol()
RETURNS trigger AS $$
BEGIN
  NEW.protocol_code := 'FBK-' || LPAD(nextval('feedback_protocol_seq')::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger (drop se já existir para ser idempotente)
DROP TRIGGER IF EXISTS trg_feedback_protocol ON user_feedback_events;
CREATE TRIGGER trg_feedback_protocol
  BEFORE INSERT ON user_feedback_events
  FOR EACH ROW
  WHEN (NEW.protocol_code IS NULL)
  EXECUTE FUNCTION generate_feedback_protocol();

-- 5. Atualizar CHECK de type para aceitar os novos valores
ALTER TABLE user_feedback_events DROP CONSTRAINT IF EXISTS user_feedback_events_type_check;
ALTER TABLE user_feedback_events ADD CONSTRAINT user_feedback_events_type_check
  CHECK (type IN ('improvement', 'feature_request', 'ux_issue', 'melhoria', 'nova_funcionalidade', 'problema'));

-- 6. Atualizar CHECK de status para os novos valores
ALTER TABLE user_feedback_events DROP CONSTRAINT IF EXISTS user_feedback_events_status_check;
ALTER TABLE user_feedback_events ADD CONSTRAINT user_feedback_events_status_check
  CHECK (status IN ('new', 'triaged', 'in_progress', 'resolved', 'wont_fix', 
                     'nova', 'planejada', 'em_desenvolvimento', 'concluida', 'nao_planejada'));

-- 7. Unique constraint para protocol_code
ALTER TABLE user_feedback_events 
  ADD CONSTRAINT user_feedback_events_protocol_code_unique UNIQUE (protocol_code);

-- 8. Policy SELECT para aluno ver seus próprios feedbacks
CREATE POLICY "Users can view own feedback"
  ON user_feedback_events FOR SELECT
  USING (actor_user_id = auth.uid());

-- 9. Backfill protocol_code para registros existentes
UPDATE user_feedback_events 
SET protocol_code = 'FBK-' || LPAD(nextval('feedback_protocol_seq')::text, 5, '0')
WHERE protocol_code IS NULL;

-- 10. Índices úteis
CREATE INDEX IF NOT EXISTS idx_feedback_actor_user ON user_feedback_events(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON user_feedback_events(status);
CREATE INDEX IF NOT EXISTS idx_feedback_protocol ON user_feedback_events(protocol_code);
;
