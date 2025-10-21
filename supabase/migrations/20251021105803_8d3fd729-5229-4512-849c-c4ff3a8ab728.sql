-- Cria função para buscar roles do usuário
-- Usa SECURITY DEFINER para evitar problemas de recursão com RLS
CREATE OR REPLACE FUNCTION public.get_user_roles(user_id uuid)
RETURNS TABLE(role app_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = get_user_roles.user_id;
END;
$$;