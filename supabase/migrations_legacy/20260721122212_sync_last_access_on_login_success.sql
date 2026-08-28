CREATE OR REPLACE FUNCTION public.sync_last_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.event_type IN ('LOGIN', 'LOGIN_SUCCESS', 'SESSION_START') THEN
    UPDATE public.profiles
    SET last_access_at = GREATEST(
      COALESCE(last_access_at, '-infinity'::timestamptz),
      NEW.occurred_at
    )
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.sync_last_access() SET search_path = public;
