-- Fix Admin RLS for Profiles
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
FOR UPDATE USING (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
    and ur.role in ('admin', 'owner')
  )
);

-- Fix Admin RLS for User Events
DROP POLICY IF EXISTS "Admins can insert events" ON public.user_events;
CREATE POLICY "Admins can insert events" ON public.user_events
FOR INSERT WITH CHECK (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
    and ur.role in ('admin', 'owner')
  )
);

-- Fix Deactivate RPC (Correct column name user_id -> id AND direct insert log)
CREATE OR REPLACE FUNCTION public.admin_deactivate_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    is_active = false,
    deactivated_at = now(),
    deactivated_by = auth.uid()
  WHERE id = target_user_id;

  INSERT INTO public.user_events (user_id, event_type, metadata)
  VALUES (
    target_user_id,
    'ACCOUNT_DEACTIVATED',
    jsonb_build_object('admin_id', auth.uid())
  );
END;
$$;

-- Fix Reactivate RPC (Correct column name user_id -> id AND direct insert log)
CREATE OR REPLACE FUNCTION public.admin_reactivate_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    is_active = true,
    deactivated_at = NULL,
    deactivated_by = NULL
  WHERE id = target_user_id;

  INSERT INTO public.user_events (user_id, event_type, metadata)
  VALUES (
    target_user_id,
    'ACCOUNT_REACTIVATED',
    jsonb_build_object('admin_id', auth.uid())
  );
END;
$$;
