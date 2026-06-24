-- 1. Create public.user_events table
CREATE TABLE IF NOT EXISTS public.user_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'SIGNUP', 'LOGIN', 'SESSION_START', 'LOGOUT',
      'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_SUCCESS', 'EMAIL_CONFIRMED',
      'MARKETING_CONSENT_GRANTED', 'MARKETING_CONSENT_REVOKED'
    )
  ),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tz TEXT,
  utc_offset_minutes INT,
  source TEXT,
  user_agent TEXT,
  ip INET,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_user_events_user_occurred ON public.user_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_type_occurred ON public.user_events(event_type, occurred_at DESC);

-- Enable RLS
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- 2. Add columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_access_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_opt_in_at TIMESTAMPTZ;

-- 3. Trigger Function: Sync Last Access
CREATE OR REPLACE FUNCTION public.sync_last_access()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type IN ('LOGIN', 'SESSION_START') THEN
    UPDATE public.profiles
    SET last_access_at = GREATEST(COALESCE(last_access_at, '-infinity'::timestamptz), NEW.occurred_at)
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Sync Last Access
DROP TRIGGER IF EXISTS on_user_event_insert ON public.user_events;
CREATE TRIGGER on_user_event_insert
AFTER INSERT ON public.user_events
FOR EACH ROW
EXECUTE FUNCTION public.sync_last_access();

-- 4. Trigger Function: Signup Event
CREATE OR REPLACE FUNCTION public.log_signup_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Avoid logging if already managed (defensive)
  INSERT INTO public.user_events (user_id, event_type, source, metadata)
  VALUES (NEW.id, 'SIGNUP', 'auth_trigger', '{"trigger": "on_auth_user_created"}'::jsonb);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: Signup Event
DROP TRIGGER IF EXISTS on_auth_user_created_log ON auth.users;
CREATE TRIGGER on_auth_user_created_log
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.log_signup_event();

-- 5. RPC: log_user_event
CREATE OR REPLACE FUNCTION public.log_user_event(
  p_event_type TEXT,
  p_source TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_tz TEXT DEFAULT NULL,
  p_utc_offset_minutes INT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_uid UUID;
BEGIN
  v_uid := auth.uid();
  
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_events (
    user_id, event_type, source, metadata, tz, utc_offset_minutes, user_agent
  ) VALUES (
    v_uid, p_event_type, p_source, p_metadata, p_tz, p_utc_offset_minutes, p_user_agent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. RLS Policies
DROP POLICY IF EXISTS "Users can view own events" ON public.user_events;
CREATE POLICY "Users can view own events" ON public.user_events
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own events" ON public.user_events;
CREATE POLICY "Users can insert own events" ON public.user_events
FOR INSERT WITH CHECK (auth.uid() = user_id);;
