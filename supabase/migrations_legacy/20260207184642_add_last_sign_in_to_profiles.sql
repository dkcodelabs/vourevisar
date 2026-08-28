-- 1. Add column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

-- 2. Create Trigger Function
CREATE OR REPLACE FUNCTION public.sync_last_sign_in()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if last_sign_in_at changed
  IF OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at THEN
    UPDATE public.profiles
    SET last_sign_in_at = NEW.last_sign_in_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger (Drop first to be safe if re-running)
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_last_sign_in();

-- 4. Backfill Data
UPDATE public.profiles p
SET last_sign_in_at = u.last_sign_in_at
FROM auth.users u
WHERE p.id = u.id
  AND p.last_sign_in_at IS NULL;;
