-- Migration: Criar funções RPC para gerenciamento de roles
-- Data: 2024-12-10
-- Objetivo: Implementar todas as funções necessárias para o sistema de roles

-- 1. Criar tabela user_roles se não existir
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'moderator', 'admin', 'owner')),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Garantir que um usuário só tenha uma role por vez
  UNIQUE(user_id)
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- 3. RLS para user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver suas próprias roles
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Admins podem ver todas as roles
CREATE POLICY "Admins can view all roles" ON user_roles
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- Apenas owners podem inserir/atualizar/deletar roles
CREATE POLICY "Owners can manage all roles" ON user_roles
  FOR ALL USING (
    EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'owner')
  );

-- 4. Função para verificar se é owner
CREATE OR REPLACE FUNCTION is_owner(check_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $
DECLARE
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(check_user_id, auth.uid());
  
  RETURN EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = target_user_id AND role = 'owner'
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Função para verificar se é admin (ou superior)
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $
DECLARE
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(check_user_id, auth.uid());
  
  RETURN EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = target_user_id AND role IN ('admin', 'owner')
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Função para obter a role mais alta de um usuário
CREATE OR REPLACE FUNCTION get_highest_user_role(check_user_id UUID DEFAULT NULL)
RETURNS TEXT AS $
DECLARE
  target_user_id UUID;
  user_role TEXT;
BEGIN
  target_user_id := COALESCE(check_user_id, auth.uid());
  
  SELECT role INTO user_role
  FROM user_roles 
  WHERE user_id = target_user_id;
  
  RETURN COALESCE(user_role, 'user');
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Função para atribuir role (apenas owners)
CREATE OR REPLACE FUNCTION assign_user_role_admin(
  target_user_id UUID,
  new_role TEXT
)
RETURNS JSON AS $
DECLARE
  result JSON;
BEGIN
  -- Verificar se quem está chamando é owner
  IF NOT is_owner() THEN
    RETURN json_build_object('error', 'Apenas proprietários podem atribuir roles');
  END IF;
  
  -- Verificar se a role é válida
  IF new_role NOT IN ('user', 'moderator', 'admin', 'owner') THEN
    RETURN json_build_object('error', 'Role inválida');
  END IF;
  
  -- Verificar se o usuário existe
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RETURN json_build_object('error', 'Usuário não encontrado');
  END IF;
  
  -- Inserir ou atualizar role
  INSERT INTO user_roles (user_id, role, assigned_by, assigned_at)
  VALUES (target_user_id, new_role, auth.uid(), NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    role = EXCLUDED.role,
    assigned_by = EXCLUDED.assigned_by,
    assigned_at = EXCLUDED.assigned_at,
    updated_at = NOW();
  
  result := json_build_object(
    'success', true,
    'message', 'Role "' || new_role || '" atribuída com sucesso',
    'user_id', target_user_id,
    'role', new_role
  );
  
  RETURN result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Função para remover role (apenas owners)
CREATE OR REPLACE FUNCTION remove_user_role_admin(
  target_user_id UUID,
  role_to_remove TEXT
)
RETURNS JSON AS $
DECLARE
  current_role TEXT;
  result JSON;
BEGIN
  -- Verificar se quem está chamando é owner
  IF NOT is_owner() THEN
    RETURN json_build_object('error', 'Apenas proprietários podem remover roles');
  END IF;
  
  -- Verificar role atual
  SELECT role INTO current_role
  FROM user_roles 
  WHERE user_id = target_user_id;
  
  IF current_role IS NULL THEN
    RETURN json_build_object('error', 'Usuário não possui role definida');
  END IF;
  
  IF current_role != role_to_remove THEN
    RETURN json_build_object('error', 'Usuário não possui a role "' || role_to_remove || '"');
  END IF;
  
  -- Não permitir remover a própria role de owner
  IF target_user_id = auth.uid() AND role_to_remove = 'owner' THEN
    RETURN json_build_object('error', 'Você não pode remover sua própria role de owner');
  END IF;
  
  -- Remover role (volta para 'user' padrão)
  UPDATE user_roles 
  SET 
    role = 'user',
    assigned_by = auth.uid(),
    assigned_at = NOW(),
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  result := json_build_object(
    'success', true,
    'message', 'Role "' || role_to_remove || '" removida. Usuário agora é "user"',
    'user_id', target_user_id,
    'old_role', role_to_remove,
    'new_role', 'user'
  );
  
  RETURN result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Função para obter todas as roles (admin only)
CREATE OR REPLACE FUNCTION get_all_user_roles_admin()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  role TEXT,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ
) AS $
BEGIN
  -- Verificar se é admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem ver todas as roles.';
  END IF;
  
  RETURN QUERY
  SELECT 
    ur.user_id,
    COALESCE(p.email, au.email) as email,
    ur.role,
    ur.assigned_by,
    ur.assigned_at
  FROM user_roles ur
  LEFT JOIN auth.users au ON ur.user_id = au.id
  LEFT JOIN profiles p ON ur.user_id = p.id
  ORDER BY 
    CASE ur.role 
      WHEN 'owner' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'moderator' THEN 3
      WHEN 'user' THEN 4
      ELSE 5
    END,
    ur.assigned_at DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Função para obter estatísticas de roles (admin only)
CREATE OR REPLACE FUNCTION get_role_stats()
RETURNS JSON AS $
DECLARE
  stats JSON;
BEGIN
  -- Verificar se é admin
  IF NOT is_admin() THEN
    RETURN json_build_object('error', 'Acesso negado');
  END IF;
  
  -- Calcular estatísticas
  WITH role_counts AS (
    SELECT 
      COUNT(*) FILTER (WHERE role = 'owner') as owners,
      COUNT(*) FILTER (WHERE role = 'admin') as admins,
      COUNT(*) FILTER (WHERE role = 'moderator') as moderators,
      COUNT(*) FILTER (WHERE role = 'user') as users,
      COUNT(*) as total_with_roles
    FROM user_roles
  ),
  user_counts AS (
    SELECT COUNT(*) as total_users FROM auth.users
  )
  SELECT json_build_object(
    'owners', COALESCE(rc.owners, 0),
    'admins', COALESCE(rc.admins, 0),
    'moderators', COALESCE(rc.moderators, 0),
    'users', COALESCE(rc.users, 0),
    'totalWithRoles', COALESCE(rc.total_with_roles, 0),
    'totalUsers', COALESCE(uc.total_users, 0),
    'usersWithoutRoles', COALESCE(uc.total_users - rc.total_with_roles, 0)
  )
  INTO stats
  FROM role_counts rc
  CROSS JOIN user_counts uc;
  
  RETURN stats;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_user_roles_updated_at()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_roles_updated_at();