-- =====================================================
-- 14. COMO DEFINIR O PRIMEIRO OWNER (VOCÊ)
-- =====================================================
-- Métodos seguros para estabelecer o proprietário inicial do sistema

-- =====================================================
-- MÉTODO 1: VIA SQL DIRETO (MAIS SIMPLES)
-- =====================================================
-- Execute no Supabase SQL Editor após fazer seu primeiro login

-- Passo 1: Encontre seu user_id
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'darciliok@gmail.com'  -- ⚠️ SUBSTITUA pelo seu email
ORDER BY created_at ASC;

-- Passo 2: Insira sua role de owner (substitua o UUID pelo resultado acima)
-- INSERT INTO public.user_roles (user_id, role, assigned_by)
-- VALUES ('SEU-UUID-AQUI', 'owner', 'SEU-UUID-AQUI');

-- =====================================================
-- MÉTODO 2: VIA MIGRATION AUTOMÁTICA (PRIMEIRA VEZ)
-- =====================================================
-- Execute apenas UMA VEZ durante o setup inicial

DO $$
DECLARE
  first_user_id UUID;
  target_email TEXT := 'darciliok@gmail.com';  -- ⚠️ SUBSTITUA pelo seu email
BEGIN
  -- Busca o usuário pelo email específico
  SELECT id INTO first_user_id 
  FROM auth.users 
  WHERE email = target_email;
  
  -- Se encontrou o usuário, atribui role de owner
  IF first_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, assigned_by)
    VALUES (first_user_id, 'owner', first_user_id)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Owner role assigned to user: % (ID: %)', target_email, first_user_id;
  ELSE
    RAISE EXCEPTION 'User with email % not found. Make sure to create account first.', target_email;
  END IF;
END $$;

-- =====================================================
-- MÉTODO 3: SETUP AUTOMÁTICO DO PRIMEIRO USUÁRIO
-- =====================================================
-- Atribui owner ao primeiro usuário criado no sistema

DO $$
DECLARE
  first_user_id UUID;
  first_user_email TEXT;
BEGIN
  -- Pega o primeiro usuário criado (mais antigo)
  SELECT id, email INTO first_user_id, first_user_email
  FROM auth.users 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  -- Se existe usuário e ainda não tem owner no sistema
  IF first_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'owner'
  ) THEN
    INSERT INTO public.user_roles (user_id, role, assigned_by)
    VALUES (first_user_id, 'owner', first_user_id)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'First owner assigned to: % (ID: %)', first_user_email, first_user_id;
  ELSE
    RAISE NOTICE 'Owner already exists or no users found';
  END IF;
END $$;

-- =====================================================
-- MÉTODO 4: VERIFICAÇÃO E CORREÇÃO
-- =====================================================
-- Verifica se existe owner e permite corrigir se necessário

DO $$
DECLARE
  owner_count INTEGER;
  target_email TEXT := 'darciliok@gmail.com';  -- ⚠️ SUBSTITUA pelo seu email
  target_user_id UUID;
BEGIN
  -- Conta quantos owners existem
  SELECT COUNT(*) INTO owner_count 
  FROM public.user_roles 
  WHERE role = 'owner';
  
  RAISE NOTICE 'Current owners in system: %', owner_count;
  
  -- Se não tem owner, cria um
  IF owner_count = 0 THEN
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = target_email;
    
    IF target_user_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role, assigned_by)
      VALUES (target_user_id, 'owner', target_user_id);
      
      RAISE NOTICE 'Owner role created for: %', target_email;
    ELSE
      RAISE EXCEPTION 'User % not found. Create account first.', target_email;
    END IF;
  ELSE
    -- Lista owners existentes
    RAISE NOTICE 'Existing owners:';
    FOR target_user_id IN 
      SELECT ur.user_id 
      FROM public.user_roles ur 
      WHERE ur.role = 'owner'
    LOOP
      SELECT email INTO target_email 
      FROM auth.users 
      WHERE id = target_user_id;
      
      RAISE NOTICE '- % (ID: %)', target_email, target_user_id;
    END LOOP;
  END IF;
END $$;