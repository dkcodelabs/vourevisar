-- =====================================================
-- 6. SECURITY DEFINER FUNCTIONS (A MÁGICA)
-- =====================================================
-- Estas funções executam com privilégios elevados e evitam recursão infinita em RLS

-- =====================================================
-- a) Função para verificar role (EVITA RECURSÃO)
-- =====================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER  -- Executa com privilégios do owner do DB
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- =====================================================
-- b) Função para verificar se é owner
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'owner'
  )
$$;

-- =====================================================
-- c) Função administrativa para atribuir roles (PROTEGIDA)
-- =====================================================
CREATE OR REPLACE FUNCTION public.assign_role(
  _target_user_id UUID,
  _role app_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- APENAS owners podem atribuir roles
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Only owners can assign roles';
  END IF;
  
  -- assign_role ADICIONA roles, não remove
  -- A proteção contra remoção de owner está em remove_role e set_user_role
  
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (_target_user_id, _role, auth.uid())
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- =====================================================
-- d) Função para remover role específica
-- =====================================================
CREATE OR REPLACE FUNCTION public.remove_role(
  _target_user_id UUID,
  _role app_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- APENAS owners podem remover roles
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Only owners can remove roles';
  END IF;
  
  -- Evita que owner remova a própria role de owner
  IF _target_user_id = auth.uid() AND _role = 'owner' THEN
    RAISE EXCEPTION 'Owners cannot remove their own owner role';
  END IF;
  
  DELETE FROM public.user_roles
  WHERE user_id = _target_user_id AND role = _role;
END;
$$;

-- =====================================================
-- e) Função para substituir todas as roles de um usuário
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_user_role(
  _target_user_id UUID,
  _role app_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- APENAS owners podem definir roles
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Only owners can set user roles';
  END IF;
  
  -- Evita que owner remova a própria role de owner
  IF _target_user_id = auth.uid() AND _role != 'owner' THEN
    RAISE EXCEPTION 'Owners cannot remove their own owner role';
  END IF;
  
  -- Remove todas as roles existentes
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  
  -- Adiciona a nova role
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (_target_user_id, _role, auth.uid());
END;
$$;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION public.has_role(UUID, app_role) IS 
'Verifica se usuário tem role específica. SECURITY DEFINER evita recursão infinita em RLS policies.';

COMMENT ON FUNCTION public.is_owner(UUID) IS 
'Verifica se usuário é owner. Função otimizada para verificações de permissão administrativa.';

COMMENT ON FUNCTION public.assign_role(UUID, app_role) IS 
'Atribui role a usuário. Apenas owners podem executar. Não remove roles existentes.';

COMMENT ON FUNCTION public.remove_role(UUID, app_role) IS 
'Remove role específica de usuário. Apenas owners podem executar. Protege role de owner.';

COMMENT ON FUNCTION public.set_user_role(UUID, app_role) IS 
'Substitui todas as roles do usuário por uma única role. Apenas owners podem executar.';