-- =====================================================
-- 5. INSERÇÃO DO PROPRIETÁRIO INICIAL
-- =====================================================
-- IMPORTANTE: Execute este script APÓS fazer seu primeiro login no sistema
-- Substitua 'SEU_USER_ID_AQUI' pelo seu UUID real do auth.users

-- ⚠️  ATENÇÃO: Substitua pelo seu user_id real antes de executar!
-- Para encontrar seu user_id, faça login e execute: SELECT auth.uid();

INSERT INTO public.user_roles (user_id, role, assigned_by, assigned_at)
VALUES (
  'e2de8e3b-9484-4064-b9ae-771a576091e1'::UUID,
  'owner',
  'e2de8e3b-9484-4064-b9ae-771a576091e1'::UUID,
  now()
)
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- COMO ENCONTRAR SEU USER_ID:
-- =====================================================
-- 1. Faça login no seu app
-- 2. No Supabase Dashboard > Authentication > Users
-- 3. Copie o UUID da coluna "id"
-- 4. Ou execute no SQL Editor: SELECT id, email FROM auth.users;

-- =====================================================
-- VERIFICAÇÃO (execute após inserir)
-- =====================================================
-- SELECT 
--   ur.user_id,
--   au.email,
--   ur.role,
--   ur.assigned_at
-- FROM user_roles ur
-- JOIN auth.users au ON au.id = ur.user_id
-- WHERE ur.role = 'owner';