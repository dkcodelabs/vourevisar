
-- Migração 1: Adicionar category e action_url à tabela user_notifications
ALTER TABLE user_notifications 
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'sistema',
  ADD COLUMN IF NOT EXISTS action_url text;

-- Constraint de validação
ALTER TABLE user_notifications 
  ADD CONSTRAINT user_notifications_category_check 
  CHECK (category IN ('sistema', 'estudo'));

-- Índice para queries por category
CREATE INDEX IF NOT EXISTS idx_user_notifications_category ON user_notifications(category);

-- Índice para queries de não-lidas por user_id
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread ON user_notifications(user_id, read) WHERE read = false;
;
