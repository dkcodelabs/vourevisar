
-- Helper function para checar se usuário é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─── public_editais: recria a policy de escrita corretamente ───
DROP POLICY IF EXISTS "Escrita de editais públicos apenas para admins" ON public_editais;
DROP POLICY IF EXISTS "admin_all_public_editais" ON public_editais;

CREATE POLICY "admin_all_public_editais" ON public_editais
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ─── user_notifications: policy de INSERT para admin ───
DROP POLICY IF EXISTS "admin_insert_notifications" ON user_notifications;

CREATE POLICY "admin_insert_notifications" ON user_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- ─── edital_suggestions: admins vêem e atualizam tudo ───
DROP POLICY IF EXISTS "admins_all_suggestions" ON edital_suggestions;
DROP POLICY IF EXISTS "admin_all_suggestions" ON edital_suggestions;

CREATE POLICY "admin_all_suggestions" ON edital_suggestions
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
;
