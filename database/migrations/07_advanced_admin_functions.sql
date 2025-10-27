-- =====================================================
-- 7. FUNÇÕES ADMINISTRATIVAS AVANÇADAS
-- =====================================================

-- =====================================================
-- a) Listar todos os usuários com suas roles (APENAS OWNERS)
-- =====================================================
CREATE OR REPLACE FUNCTION public.list_users_with_roles()
RETURNS TABLE (
  user_id UUID,
  email VARCHAR(255),
  roles TEXT[],
  highest_role app_role,
  created_at TIMESTAMP WITH TIME ZONE,
  last_sign_in_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- APENAS owners podem listar usuários
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Only owners can list users';
  END IF;
  
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email,
    COALESCE(ARRAY_AGG(ur.role::TEXT), ARRAY[]::TEXT[]) as roles,
    CASE 
      WHEN 'owner' = ANY(ARRAY_AGG(ur.role)) THEN 'owner'::app_role
      WHEN 'admin' = ANY(ARRAY_AGG(ur.role)) THEN 'admin'::app_role
      WHEN 'moderator' = ANY(ARRAY_AGG(ur.role)) THEN 'moderator'::app_role
      WHEN 'user' = ANY(ARRAY_AGG(ur.role)) THEN 'user'::app_role
      ELSE NULL::app_role
    END as highest_role,
    au.created_at,
    au.last_sign_in_at
  FROM auth.users au
  LEFT JOIN public.user_roles ur ON ur.user_id = au.id
  GROUP BY au.id, au.email, au.created_at, au.last_sign_in_at
  ORDER BY au.created_at DESC;
END;
$$;

-- =====================================================
-- b) Obter informações completas de um usuário específico
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_info(_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  email VARCHAR(255),
  roles TEXT[],
  highest_role app_role,
  role_history JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  last_sign_in_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- APENAS owners podem ver informações detalhadas
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Only owners can view user information';
  END IF;
  
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email,
    COALESCE(ARRAY_AGG(ur.role::TEXT), ARRAY[]::TEXT[]) as roles,
    CASE 
      WHEN 'owner' = ANY(ARRAY_AGG(ur.role)) THEN 'owner'::app_role
      WHEN 'admin' = ANY(ARRAY_AGG(ur.role)) THEN 'admin'::app_role
      WHEN 'moderator' = ANY(ARRAY_AGG(ur.role)) THEN 'moderator'::app_role
      WHEN 'user' = ANY(ARRAY_AGG(ur.role)) THEN 'user'::app_role
      ELSE NULL::app_role
    END as highest_role,
    COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'role', ur.role,
          'assigned_at', ur.assigned_at,
          'assigned_by', ur.assigned_by
        )
      ) FILTER (WHERE ur.role IS NOT NULL),
      '[]'::JSONB
    ) as role_history,
    au.created_at,
    au.last_sign_in_at
  FROM auth.users au
  LEFT JOIN public.user_roles ur ON ur.user_id = au.id
  WHERE au.id = _user_id
  GROUP BY au.id, au.email, au.created_at, au.last_sign_in_at;
END;
$$;

-- =====================================================
-- c) Função para verificar hierarquia com SECURITY DEFINER
-- =====================================================
CREATE OR REPLACE FUNCTION public.has_role_or_higher(_user_id UUID, _min_role app_role)
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
  FROM public.user_roles 
  WHERE user_id = _user_id;
  
  -- Se não tem roles, retorna false
  IF user_roles_array IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verifica hierarquia (owner > admin > moderator > user)
  CASE _min_role
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

-- =====================================================
-- d) Função para auditoria de roles (log de mudanças)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_role_audit_log(_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  user_id UUID,
  user_email VARCHAR(255),
  role app_role,
  assigned_at TIMESTAMP WITH TIME ZONE,
  assigned_by UUID,
  assigned_by_email VARCHAR(255)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- APENAS owners podem ver logs de auditoria
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Only owners can view audit logs';
  END IF;
  
  RETURN QUERY
  SELECT 
    ur.user_id,
    au_target.email as user_email,
    ur.role,
    ur.assigned_at,
    ur.assigned_by,
    au_assigner.email as assigned_by_email
  FROM public.user_roles ur
  LEFT JOIN auth.users au_target ON au_target.id = ur.user_id
  LEFT JOIN auth.users au_assigner ON au_assigner.id = ur.assigned_by
  ORDER BY ur.assigned_at DESC
  LIMIT _limit;
END;
$$;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION public.list_users_with_roles() IS 
'Lista todos os usuários com suas roles. Apenas owners podem executar. Retorna array de roles e role mais alta.';

COMMENT ON FUNCTION public.get_user_info(UUID) IS 
'Obtém informações completas de um usuário específico, incluindo histórico de roles. Apenas owners.';

COMMENT ON FUNCTION public.has_role_or_higher(UUID, app_role) IS 
'Versão SECURITY DEFINER da verificação de hierarquia. Evita problemas de RLS em policies complexas.';

COMMENT ON FUNCTION public.get_role_audit_log(INTEGER) IS 
'Retorna log de auditoria das atribuições de roles. Mostra quem atribuiu o que e quando. Apenas owners.';