-- =====================================================
-- CORREÇÃO DAS PERMISSÕES DE ATRIBUIÇÃO DE ROLES
-- =====================================================

-- Recriar a função assign_user_role_admin com permissões mais flexíveis
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

  -- Regras de negócio CORRIGIDAS para atribuição de roles
  CASE new_role
    WHEN 'owner' THEN
      -- Apenas owners podem criar outros owners
      IF current_user_highest_role != 'owner' THEN
        RAISE EXCEPTION 'Apenas proprietários podem atribuir a role de owner';
      END IF;
      
    WHEN 'admin' THEN
      -- Owners e admins podem criar outros admins
      IF NOT has_role_or_higher(current_user_id, 'admin') THEN
        RAISE EXCEPTION 'Apenas admins ou proprietários podem atribuir a role de admin';
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
      
    ELSE
      RAISE EXCEPTION 'Role inválida: %', new_role;
  END CASE;

  -- Verificar se não está tentando alterar um owner (apenas outros owners podem)
  IF target_user_highest_role = 'owner' AND current_user_highest_role != 'owner' THEN
    RAISE EXCEPTION 'Apenas proprietários podem alterar roles de outros proprietários';
  END IF;

  -- Inserir ou atualizar a role
  INSERT INTO user_roles (user_id, role, assigned_by, assigned_at)
  VALUES (target_user_id, new_role, current_user_id, NOW())
  ON CONFLICT (user_id, role) DO UPDATE SET
    assigned_by = EXCLUDED.assigned_by,
    assigned_at = EXCLUDED.assigned_at;

  RETURN TRUE;
END;
$$;

-- Recriar a função remove_user_role_admin com permissões corrigidas
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

  -- Regras de negócio CORRIGIDAS para remoção de roles
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
      -- Owners e admins podem remover outros admins
      IF NOT has_role_or_higher(current_user_id, 'admin') THEN
        RAISE EXCEPTION 'Apenas admins ou proprietários podem remover a role de admin';
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
      
    ELSE
      RAISE EXCEPTION 'Role inválida: %', role_to_remove;
  END CASE;

  -- Verificar se não está tentando alterar um owner (apenas outros owners podem)
  IF target_user_highest_role = 'owner' AND current_user_highest_role != 'owner' THEN
    RAISE EXCEPTION 'Apenas proprietários podem alterar roles de outros proprietários';
  END IF;

  -- Remover a role
  DELETE FROM user_roles 
  WHERE user_id = target_user_id AND role = role_to_remove;

  RETURN TRUE;
END;
$$;

-- Comentários atualizados
COMMENT ON FUNCTION assign_user_role_admin(UUID, app_role) IS 'Atribui uma role a um usuário - Admins podem atribuir admin/moderator/user, Owners podem atribuir qualquer role';
COMMENT ON FUNCTION remove_user_role_admin(UUID, app_role) IS 'Remove uma role de um usuário - Admins podem remover admin/moderator/user, Owners podem remover qualquer role';