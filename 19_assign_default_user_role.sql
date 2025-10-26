-- =====================================================
-- ATRIBUIR ROLE "USER" PARA TODOS OS USUÁRIOS SEM ROLE
-- =====================================================

-- Inserir role "user" para todos os usuários que não têm nenhuma role
INSERT INTO user_roles (user_id, role, assigned_by, assigned_at)
SELECT 
  p.id,
  'user'::app_role,
  p.id, -- Auto-atribuído
  NOW()
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE ur.user_id IS NULL -- Usuários sem nenhuma role
ON CONFLICT (user_id, role) DO NOTHING;

-- Verificar resultado
SELECT 
  p.email,
  CASE 
    WHEN COUNT(ur.role) = 0 THEN 'Sem roles'
    ELSE STRING_AGG(ur.role::TEXT, ', ' ORDER BY 
      CASE ur.role
        WHEN 'owner' THEN 4
        WHEN 'admin' THEN 3
        WHEN 'moderator' THEN 2
        WHEN 'user' THEN 1
      END DESC
    )
  END as roles
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY p.id, p.email
ORDER BY p.email;