-- Criar função para verificar se email já existe (bypass RLS)
CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check text)
RETURNS TABLE(
  email_exists boolean,
  provider_type text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN p.email IS NOT NULL THEN true ELSE false END as email_exists,
    COALESCE(p.provider_type, 'Email') as provider_type
  FROM profiles p
  WHERE p.email = email_to_check
  LIMIT 1;
  
  -- Se não encontrou na tabela profiles, retorna false
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Unknown'::text;
  END IF;
END;
$$;