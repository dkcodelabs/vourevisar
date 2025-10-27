-- =====================================================
-- CORREÇÃO DE CONFLITO DE FUNÇÕES
-- =====================================================

-- Primeiro, vamos dropar as funções que podem estar conflitando
DROP FUNCTION IF EXISTS get_user_highest_role(uuid);
DROP FUNCTION IF EXISTS get_user_highest_role(UUID);
DROP FUNCTION IF EXISTS assign_user_role(UUID, app_role);
DROP FUNCTION IF EXISTS remove_user_role(UUID, app_role);
DROP FUNCTION IF EXISTS get_all_user_roles();

-- Agora vamos recriar as funções com nomes únicos para evitar conflitos
-- =====================================================
-- FUNÇÃO PARA BUSCAR TODOS OS USUÁRIOS E SUAS ROLES
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_user_roles_admin()
RETURNS TABLE (
  user_id UUID,
  role app_role
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar se o usuário atual é admin ou owner
  IF NOT (
    SELECT has_role_or_higher(auth.uid(), 'admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas admins podem ver roles de usuários.';
  END IF;

  RETURN QUERY
  SELECT ur.user_id, ur.role
  FROM user_roles ur;
END;
$$;

-- =====================================================
-- FUNÇÃO AUXILIAR PARA OBTER A ROLE MAIS ALTA
-- =====================================================
CREATE OR REPLACE FUNCTION get_highest_user_role(target_user_id UUID)
RETURNS app_role
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  highest_role app_role;
BEGIN
  SELECT role INTO highest_role
  FROM user_roles ur
  WHERE ur.user_id = target_user_id
  ORDER BY 
    CASE role
      WHEN 'owner' THEN 4
      WHEN 'admin' THEN 3
      WHEN 'moderator' THEN 2
      WHEN 'user' THEN 1
    END DESC
  LIMIT 1;
  
  RETURN highest_role;
END;
$$;

-- =====================================================
-- FUNÇÃO PARA ATRIBUIR ROLE A UM USUÁRIO
-- =====================================================
CREATE OR REPLACE FUNCTION assign_user_role_admin(
  target_user_id UUID,
  new_role app_role
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id UUID;
  current_user_highest_role app_role;
  target_user_highest_role app_role;
BEGIN
  -- Obter ID do usuário atual
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar role do usuário atual
  SELECT get_highest_user_role(current_user_id) INTO current_user_highest_role;
  
  -- Verificar role atual do usuário alvo
  SELECT get_highest_user_role(target_user_id) INTO target_user_highest_role;

  -- Regras de negócio para atribuição de roles
  CASE new_role
    WHEN 'owner' THEN
      -- Apenas owners podem criar outros owners
      IF current_user_highest_role != 'owner' THEN
        RAISE EXCEPTION 'Apenas proprietários podem atribuir a role de owner';
      END IF;
      
    WHEN 'admin' THEN
      -- Apenas owners podem criar admins
      IF current_user_highest_role != 'owner' THEN
        RAISE EXCEPTION 'Apenas proprietários podem atribuir a role de admin';
      END IF;
      
    WHEN 'moderator' THEN
      -- Admins e owners podem criar moderators
      IF NOT has_role_or_higher(current_user_id, 'admin') THEN
        RAISE EXCEPTION 'Apenas admins ou proprietários podem atribuir a role de moderator';
      END IF;
      
    WHEN 'user' THEN
      -- Moderators e acima podem atribuir role de user
      IF NOT has_role_or_higher(current_user_id, 'moderator') THEN
        RAISE EXCEPTION 'Apenas moderators ou acima podem atribuir a role de user';
      END IF;
  END CASE;

  -- Inserir a nova role (ON CONFLICT para evitar duplicatas)
  INSERT INTO user_roles (user_id, role, assigned_by, assigned_at)
  VALUES (target_user_id, new_role, current_user_id, NOW())
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN TRUE;
END;
$$;

-- =====================================================
-- FUNÇÃO PARA REMOVER ROLE DE UM USUÁRIO
-- =====================================================
CREATE OR REPLACE FUNCTION remove_user_role_admin(
  target_user_id UUID,
  role_to_remove app_role
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id UUID;
  current_user_highest_role app_role;
  target_user_highest_role app_role;
  owner_count INTEGER;
BEGIN
  -- Obter ID do usuário atual
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar role do usuário atual
  SELECT get_highest_user_role(current_user_id) INTO current_user_highest_role;
  
  -- Verificar role atual do usuário alvo
  SELECT get_highest_user_role(target_user_id) INTO target_user_highest_role;

  -- Regras de negócio para remoção de roles
  CASE role_to_remove
    WHEN 'owner' THEN
      -- Apenas owners podem remover outros owners
      IF current_user_highest_role != 'owner' THEN
        RAISE EXCEPTION 'Apenas proprietários podem remover a role de owner';
      END IF;
      
      -- Verificar se não é o último owner
      SELECT COUNT(*) INTO owner_count
      FROM user_roles 
      WHERE role = 'owner';
      
      IF owner_count <= 1 THEN
        RAISE EXCEPTION 'Não é possível remover o último proprietário do sistema';
      END IF;
      
    WHEN 'admin' THEN
      -- Apenas owners podem remover admins
      IF current_user_highest_role != 'owner' THEN
        RAISE EXCEPTION 'Apenas proprietários podem remover a role de admin';
      END IF;
      
    WHEN 'moderator' THEN
      -- Admins e owners podem remover moderators
      IF NOT has_role_or_higher(current_user_id, 'admin') THEN
        RAISE EXCEPTION 'Apenas admins ou proprietários podem remover a role de moderator';
      END IF;
      
    WHEN 'user' THEN
      -- Moderators e acima podem remover role de user
      IF NOT has_role_or_higher(current_user_id, 'moderator') THEN
        RAISE EXCEPTION 'Apenas moderators ou acima podem remover a role de user';
      END IF;
  END CASE;

  -- Remover a role
  DELETE FROM user_roles 
  WHERE user_id = target_user_id 
    AND role = role_to_remove;

  RETURN TRUE;
END;
$$;

-- Comentários para documentação
COMMENT ON FUNCTION get_all_user_roles_admin() IS 'Retorna todas as roles de todos os usuários (apenas para admins+)';
COMMENT ON FUNCTION assign_user_role_admin(UUID, app_role) IS 'Atribui uma role a um usuário com verificação de permissões';
COMMENT ON FUNCTION remove_user_role_admin(UUID, app_role) IS 'Remove uma role de um usuário com verificação de permissões';
COMMENT ON FUNCTION get_highest_user_role(UUID) IS 'Retorna a role mais alta de um usuário específico';