
-- Tabela de sugestões de editais pelos usuários
CREATE TABLE IF NOT EXISTS edital_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  concurso TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'cadastrado', 'ja_cadastrado', 'nao_cadastrado')),
  response_message TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE edital_suggestions ENABLE ROW LEVEL SECURITY;

-- Usuários podem inserir e ver suas próprias sugestões
CREATE POLICY "users_insert_own_suggestions" ON edital_suggestions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_view_own_suggestions" ON edital_suggestions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Tabela de notificações dos usuários
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT FALSE,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver e atualizar apenas as próprias notificações
CREATE POLICY "users_view_own_notifications" ON user_notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_notifications" ON user_notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
;
