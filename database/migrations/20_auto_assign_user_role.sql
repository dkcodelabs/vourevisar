-- =====================================================
-- TRIGGER PARA ATRIBUIR ROLE "USER" AUTOMATICAMENTE
-- =====================================================

-- Função que será executada quando um novo usuário for criado
CREATE OR REPLACE FUNCTION auto_assign_user_role()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Inserir role "user" para o novo usuário
  INSERT INTO user_roles (user_id, role, assigned_by, assigned_at)
  VALUES (NEW.id, 'user'::app_role, NEW.id, NOW())
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Criar trigger que executa após inserir um novo profile
CREATE OR REPLACE TRIGGER trigger_auto_assign_user_role
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_user_role();

-- Comentário para documentação
COMMENT ON FUNCTION auto_assign_user_role() IS 'Atribui automaticamente a role "user" para novos usuários';
COMMENT ON TRIGGER trigger_auto_assign_user_role ON profiles IS 'Trigger que atribui role "user" automaticamente para novos usuários';