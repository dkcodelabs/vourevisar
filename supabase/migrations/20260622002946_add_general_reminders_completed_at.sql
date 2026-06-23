ALTER TABLE public.general_reminders
ADD COLUMN completed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.sync_general_reminder_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.completed IS TRUE THEN
    NEW.completed_at := COALESCE(NEW.completed_at, NOW());
  ELSIF NEW.completed IS TRUE AND COALESCE(OLD.completed, FALSE) IS FALSE THEN
    NEW.completed_at := NOW();
  ELSIF NEW.completed IS FALSE AND COALESCE(OLD.completed, FALSE) IS TRUE THEN
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_general_reminder_completed_at
BEFORE INSERT OR UPDATE OF completed ON public.general_reminders
FOR EACH ROW
EXECUTE FUNCTION public.sync_general_reminder_completed_at();
