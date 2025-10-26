-- =====================================================
-- 16. ADICIONAR SEGUNDO OWNER PARA TESTES LOCAIS
-- =====================================================
-- Adiciona dwefotografia@gmail.com como owner para testes

DO $$
DECLARE
  target_user_id UUID;
  target_email TEXT := 'dwefotografia@gmail.com';
BEGIN
  -- Busca o usuário pelo email
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = target_email;
  
  -- Se encontrou o usuário, atribui role de owner
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, assigned_by)
    VALUES (target_user_id, 'owner', target_user_id)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Owner role assigned to user: % (ID: %)', target_email, target_user_id;
  ELSE
    RAISE NOTICE 'User with email % not found. User needs to login first to create account.', target_email;
  END IF;
END $$;

-- =====================================================
-- VERIFICAÇÃO - Execute após o script acima
-- =====================================================
-- Verifica se ambos os owners foram criados
SELECT 
  ur.user_id,
  au.email,
  ur.role,
  ur.assigned_at
FROM public.user_roles ur
JOIN auth.users au ON au.id = ur.user_id
WHERE ur.role = 'owner'
ORDER BY ur.assigned_at;