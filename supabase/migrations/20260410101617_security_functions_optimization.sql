-- Re-creating security functions as SECURITY DEFINER to bypass RLS recursion and improve performance

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role_or_higher(_user_id uuid, _min_role public.app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_roles_array app_role[];
BEGIN
  SELECT ARRAY_AGG(role) INTO user_roles_array
  FROM public.user_roles 
  WHERE user_id = _user_id;
  
  IF user_roles_array IS NULL THEN
    RETURN FALSE;
  END IF;
  
  CASE _min_role
    WHEN 'user' THEN 
      RETURN user_roles_array && ARRAY['user', 'moderator', 'admin', 'owner']::app_role[];
    WHEN 'moderator' THEN 
      RETURN user_roles_array && ARRAY['moderator', 'admin', 'owner']::app_role[];
    WHEN 'admin' THEN 
      RETURN user_roles_array && ARRAY['admin', 'owner']::app_role[];
    WHEN 'owner' THEN 
      RETURN user_roles_array && ARRAY['owner']::app_role[];
    ELSE 
      RETURN FALSE;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin'::public.app_role, 'owner'::public.app_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'owner'::public.app_role
  );
$$;
;
