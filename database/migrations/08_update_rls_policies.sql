-- =====================================================
-- 8. ATUALIZAÇÃO DAS RLS POLICIES COM SECURITY DEFINER
-- =====================================================
-- Agora que temos as funções SECURITY DEFINER, vamos atualizar as policies
-- para usar essas funções e evitar recursão infinita

-- =====================================================
-- REMOVE TODAS AS POLICIES EXISTENTES
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Block direct modifications" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles via security definer" ON public.user_roles;
DROP POLICY IF EXISTS "Only admin functions can modify roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admin functions can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admin functions can delete roles" ON public.user_roles;

-- =====================================================
-- NOVAS POLICIES USANDO SECURITY DEFINER FUNCTIONS
-- =====================================================

-- Policy 1: Usuários podem ver suas próprias roles
CREATE POLICY "Users can view own roles via security definer" 
ON public.user_roles 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  public.is_owner(auth.uid())  -- Owners podem ver todas as roles
);

-- Policy 2: Apenas funções administrativas podem modificar
CREATE POLICY "Only admin functions can modify roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (false);  -- Bloqueia INSERT direto

CREATE POLICY "Only admin functions can update roles" 
ON public.user_roles 
FOR UPDATE 
USING (false);  -- Bloqueia UPDATE direto

CREATE POLICY "Only admin functions can delete roles" 
ON public.user_roles 
FOR DELETE 
USING (false);  -- Bloqueia DELETE direto

-- =====================================================
-- EXEMPLO DE POLICY PARA OUTRAS TABELAS
-- =====================================================
-- Exemplo: Como usar as funções SECURITY DEFINER em outras tabelas

/*
-- Exemplo para uma tabela de posts
CREATE POLICY "Authors and moderators can edit posts" 
ON posts 
FOR UPDATE 
USING (
  author_id = auth.uid() OR 
  public.has_role_or_higher(auth.uid(), 'moderator')
);

-- Exemplo para uma tabela administrativa
CREATE POLICY "Only admins can access admin data" 
ON admin_settings 
FOR ALL 
USING (public.has_role_or_higher(auth.uid(), 'admin'));
*/

-- =====================================================
-- COMENTÁRIOS EXPLICATIVOS
-- =====================================================

COMMENT ON POLICY "Users can view own roles via security definer" ON public.user_roles IS 
'Permite que usuários vejam suas próprias roles. Owners podem ver todas as roles usando função SECURITY DEFINER.';

COMMENT ON POLICY "Only admin functions can modify roles" ON public.user_roles IS 
'Bloqueia INSERT direto. Roles só podem ser adicionadas via funções administrativas (assign_role, set_user_role).';

COMMENT ON POLICY "Only admin functions can update roles" ON public.user_roles IS 
'Bloqueia UPDATE direto. Modificações só via funções administrativas.';

COMMENT ON POLICY "Only admin functions can delete roles" ON public.user_roles IS 
'Bloqueia DELETE direto. Remoções só via funções administrativas (remove_role, set_user_role).';