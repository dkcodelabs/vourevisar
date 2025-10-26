-- =====================================================
-- VERSÃO SIMPLES: ATRIBUIR ROLE "USER" PARA TODOS
-- =====================================================

-- Inserir role "user" para todos os usuários que não têm nenhuma role
INSERT INTO user_roles (user_id, role, assigned_by, assigned_at)
SELECT 
  p.id,
  'user'::app_role,
  p.id,
  NOW()
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = p.id
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Verificar quantos usuários foram atualizados
SELECT 
  'Usuários com roles' as status,
  COUNT(*) as quantidade
FROM (
  SELECT DISTINCT user_id 
  FROM user_roles
) as users_with_roles

UNION ALL

SELECT 
  'Total de usuários' as status,
  COUNT(*) as quantidade
FROM profiles;

-- Mostrar roles por usuário (versão simples)
SELECT 
  p.email,
  ur.role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
ORDER BY p.email, ur.role;