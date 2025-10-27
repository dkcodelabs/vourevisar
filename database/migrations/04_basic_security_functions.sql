-- =====================================================
-- 4. FUNÇÕES BÁSICAS DE VERIFICAÇÃO DE ROLES
-- =====================================================

-- Função para verificar se usuário tem role específica
CREATE OR REPLACE FUNCTION public.has_role(
  check_role app_role, 
  check_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Retorna true se o usuário tem a role especificada
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = check_user_id 
    AND role = check_role
  );
END;
$$;

-- Função para verificar hierarquia de roles (role igual ou superior)
CREATE OR REPLACE FUNCTION public.has_role_or_higher(
  min_role app_role, 
  check_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_roles_array app_role[];
BEGIN
  -- Busca todas as roles do usuário
  SELECT ARRAY_AGG(role) INTO user_roles_array
  FROM user_roles 
  WHERE user_id = check_user_id;
  
  -- Se não tem roles, retorna false
  IF user_roles_array IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verifica hierarquia (owner > admin > moderator > user)
  CASE min_role
    WHEN 'user' THEN 
      RETURN user_roles_array && ARRAY['user', 'moderator', 'admin', 'owner']::app_role[];
    WHEN 'moderator' THEN 
      RETURN user_roles_array && ARRAY['moderator', 'admin', 'owner']::app_role[];
    WHEN 'admin' THEN 
      RETURN user_roles_array && ARRAY['admin', 'owner']::app_role[];
    WHEN 'owner' THEN 
      RETURN user_roles_array && ARRAY['owner']::app_role[];
    ELSE 
      RETURN FALSE;
  END CASE;
END;
$$;

-- Função para obter a role mais alta do usuário
CREATE OR REPLACE FUNCTION public.get_user_highest_role(
  check_user_id UUID DEFAULT auth.uid()
)
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_roles_array app_role[];
BEGIN
  -- Busca todas as roles do usuário
  SELECT ARRAY_AGG(role) INTO user_roles_array
  FROM user_roles 
  WHERE user_id = check_user_id;
  
  -- Se não tem roles, retorna null
  IF user_roles_array IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Retorna a role mais alta na hierarquia
  IF 'owner' = ANY(user_roles_array) THEN RETURN 'owner';
  ELSIF 'admin' = ANY(user_roles_array) THEN RETURN 'admin';
  ELSIF 'moderator' = ANY(user_roles_array) THEN RETURN 'moderator';
  ELSIF 'user' = ANY(user_roles_array) THEN RETURN 'user';
  ELSE RETURN NULL;
  END IF;
END;
$$;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION public.has_role(app_role, UUID) IS 
'Verifica se um usuário tem uma role específica. Uso: SELECT has_role(''admin'', user_id)';

COMMENT ON FUNCTION public.has_role_or_higher(app_role, UUID) IS 
'Verifica se um usuário tem uma role igual ou superior na hierarquia. Uso: SELECT has_role_or_higher(''moderator'')';

COMMENT ON FUNCTION public.get_user_highest_role(UUID) IS 
'Retorna a role mais alta do usuário na hierarquia. Útil para exibir no frontend.';