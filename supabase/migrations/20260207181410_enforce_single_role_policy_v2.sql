-- 1. Clean up duplicate roles, keeping only the highest privilege
WITH RankedRoles AS (
  SELECT 
    user_id, 
    role,
    CASE role
      WHEN 'owner' THEN 4
      WHEN 'admin' THEN 3
      WHEN 'moderator' THEN 2
      ELSE 1
    END as rank,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY 
      CASE role
        WHEN 'owner' THEN 4
        WHEN 'admin' THEN 3
        WHEN 'moderator' THEN 2
        ELSE 1
      END DESC, 
      assigned_at DESC NULLS LAST
    ) as rn
  FROM user_roles
)
DELETE FROM user_roles
WHERE (user_id, role) IN (
  SELECT user_id, role 
  FROM RankedRoles 
  WHERE rn > 1
);

-- 2. Add Unique Constraint to prevent future duplicates at DB level
-- Drop constraint if exists to avoid error on retry
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

-- 3. Update the assign_user_role_admin function to enforce single role logic
CREATE OR REPLACE FUNCTION public.assign_user_role_admin(target_user_id uuid, new_role app_role)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  current_user_highest_role app_role;
  target_user_highest_role app_role;
BEGIN
  -- Obter ID do usuário atual
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar role do usuário atual
  SELECT get_highest_user_role(current_user_id) INTO current_user_highest_role;
  
  -- Verificar role atual do usuário alvo
  SELECT get_highest_user_role(target_user_id) INTO target_user_highest_role;

  -- Regras de negócio CORRIGIDAS para atribuição de roles
  CASE new_role
    WHEN 'owner' THEN
      -- Apenas owners podem criar outros owners
      IF current_user_highest_role != 'owner' THEN
        RAISE EXCEPTION 'Apenas proprietários podem atribuir a role de owner';
      END IF;
      
    WHEN 'admin' THEN
      -- Owners e admins podem criar outros admins
      IF NOT has_role_or_higher(current_user_id, 'admin') THEN
        RAISE EXCEPTION 'Apenas admins ou proprietários podem atribuir a role de admin';
      END IF;
      
    WHEN 'moderator' THEN
      -- Admins e owners podem criar moderators
      IF NOT has_role_or_higher(current_user_id, 'admin') THEN
        RAISE EXCEPTION 'Apenas admins ou proprietários podem atribuir a role de moderator';
      END IF;
      
    WHEN 'user' THEN
      -- Moderators e acima podem atribuir role de user
      IF NOT has_role_or_higher(current_user_id, 'moderator') THEN
        RAISE EXCEPTION 'Apenas moderators ou acima podem atribuir a role de user';
      END IF;
      
    ELSE
      RAISE EXCEPTION 'Role inválida: %', new_role;
  END CASE;

  -- Verificar se não está tentando alterar um owner (apenas outros owners podem)
  IF target_user_highest_role = 'owner' AND current_user_highest_role != 'owner' THEN
    RAISE EXCEPTION 'Apenas proprietários podem alterar roles de outros proprietários';
  END IF;

  -- ENFORCE SINGLE ROLE: Delete existing roles first
  DELETE FROM user_roles WHERE user_id = target_user_id;

  -- Inserir a nova role
  INSERT INTO user_roles (user_id, role, assigned_by, assigned_at)
  VALUES (target_user_id, new_role, current_user_id, NOW());

  RETURN TRUE;
END;
$function$;;
