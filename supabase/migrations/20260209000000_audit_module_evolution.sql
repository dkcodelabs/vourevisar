-- ============================================================
-- AUDIT MODULE EVOLUTION - Professional Audit System
-- ============================================================
-- This migration evolves the user_events table to support:
-- 1. Actor/Target separation (who did what to whom)
-- 2. Status tracking (SUCCESS/FAIL)
-- 3. Performance indexes
-- 4. Updated RLS policies
-- ============================================================

-- ============================================================
-- PHASE 1: Add new columns (non-destructive)
-- ============================================================

-- Add target_user_id column (the user affected by the action)
ALTER TABLE public.user_events
  ADD COLUMN IF NOT EXISTS target_user_id uuid REFERENCES auth.users(id);

-- Add actor_user_id column (the user who performed the action)
ALTER TABLE public.user_events
  ADD COLUMN IF NOT EXISTS actor_user_id uuid REFERENCES auth.users(id);

-- Add status column with default SUCCESS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_events' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.user_events ADD COLUMN status text NOT NULL DEFAULT 'SUCCESS';
  END IF;
END $$;

-- Add status check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_events_status_check'
  ) THEN
    ALTER TABLE public.user_events
      ADD CONSTRAINT user_events_status_check CHECK (status IN ('SUCCESS', 'FAIL'));
  END IF;
END $$;

-- ============================================================
-- PHASE 2: Migrate existing data
-- ============================================================

-- Copy user_id to target_user_id for existing records
UPDATE public.user_events 
SET target_user_id = user_id 
WHERE target_user_id IS NULL AND user_id IS NOT NULL;

-- For admin actions, extract actor from metadata if available
UPDATE public.user_events
SET actor_user_id = (metadata->>'admin_id')::uuid
WHERE actor_user_id IS NULL 
  AND metadata->>'admin_id' IS NOT NULL
  AND event_type IN ('ACCOUNT_DEACTIVATED', 'ACCOUNT_REACTIVATED');

-- ============================================================
-- PHASE 3: Update event type constraint
-- ============================================================

ALTER TABLE public.user_events
DROP CONSTRAINT IF EXISTS user_events_event_type_check;

ALTER TABLE public.user_events
ADD CONSTRAINT user_events_event_type_check CHECK (
  event_type IN (
    'SIGNUP', 
    'LOGIN', 
    'SESSION_START', 
    'LOGOUT', 
    'PASSWORD_RESET_REQUEST', 
    'PASSWORD_RESET_SUCCESS', 
    'EMAIL_CONFIRMED', 
    'EMAIL_CHANGED',
    'MARKETING_CONSENT_GRANTED', 
    'MARKETING_CONSENT_REVOKED',
    'ACCOUNT_DEACTIVATED',
    'ACCOUNT_REACTIVATED',
    'ROLE_CHANGED',
    'PROFILE_UPDATED'
  )
);

-- ============================================================
-- PHASE 4: Create performance indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_events_occurred_at_desc 
  ON public.user_events(occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_events_type_occurred 
  ON public.user_events(event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_events_target 
  ON public.user_events(target_user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_events_actor 
  ON public.user_events(actor_user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_events_status 
  ON public.user_events(status, occurred_at DESC);

-- ============================================================
-- PHASE 5: Update RLS Policies
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own events" ON public.user_events;
DROP POLICY IF EXISTS "Users can insert own events" ON public.user_events;
DROP POLICY IF EXISTS "Admins can insert events" ON public.user_events;
DROP POLICY IF EXISTS "Admins can view all events" ON public.user_events;

-- Enable RLS if not already enabled
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own logs (as target or actor)
CREATE POLICY "Users can view own events" ON public.user_events
FOR SELECT USING (
  target_user_id = auth.uid() 
  OR actor_user_id = auth.uid()
  OR user_id = auth.uid()  -- Backward compatibility
);

-- Policy: Admins can view ALL logs
CREATE POLICY "Admins can view all events" ON public.user_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'owner')
  )
);

-- Policy: Admins can insert events (for admin actions)
CREATE POLICY "Admins can insert events" ON public.user_events
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'owner')
  )
);

-- Policy: Users can insert their own events (for self-logging)
CREATE POLICY "Users can insert own events" ON public.user_events
FOR INSERT WITH CHECK (
  target_user_id = auth.uid() 
  OR user_id = auth.uid()  -- Backward compatibility
);

-- ============================================================
-- PHASE 6: Update log_user_event RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_user_event(
  p_event_type text,
  p_source text DEFAULT 'web_app',
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_tz text DEFAULT NULL,
  p_utc_offset_minutes int DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_target_user_id uuid DEFAULT NULL,
  p_actor_user_id uuid DEFAULT NULL,
  p_status text DEFAULT 'SUCCESS'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_target uuid;
  v_actor uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Determine target: explicit param > current user
  v_target := COALESCE(p_target_user_id, v_user_id);
  
  -- Determine actor: explicit param > current user (for self-actions)
  v_actor := COALESCE(p_actor_user_id, v_user_id);
  
  -- Build enriched metadata
  INSERT INTO public.user_events (
    user_id,
    target_user_id,
    actor_user_id,
    event_type,
    source,
    status,
    metadata,
    occurred_at
  ) VALUES (
    v_target,  -- Backward compatibility
    v_target,
    v_actor,
    p_event_type,
    p_source,
    p_status,
    jsonb_build_object(
      'tz', p_tz,
      'utc_offset_minutes', p_utc_offset_minutes,
      'user_agent', p_user_agent
    ) || COALESCE(p_metadata, '{}'::jsonb),
    now()
  );
END;
$$;

-- ============================================================
-- PHASE 7: Update admin RPCs to use new columns
-- ============================================================

-- Fix Deactivate RPC
CREATE OR REPLACE FUNCTION public.admin_deactivate_user(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profile
  UPDATE public.profiles
  SET
    is_active = false,
    deactivated_at = now(),
    deactivated_by = auth.uid()
  WHERE id = p_target_user_id;

  -- Log event with actor/target separation
  INSERT INTO public.user_events (
    user_id, 
    target_user_id, 
    actor_user_id, 
    event_type, 
    status,
    metadata
  ) VALUES (
    p_target_user_id,
    p_target_user_id,
    auth.uid(),
    'ACCOUNT_DEACTIVATED',
    'SUCCESS',
    jsonb_build_object('reason', 'Admin action')
  );
END;
$$;

-- Fix Reactivate RPC
CREATE OR REPLACE FUNCTION public.admin_reactivate_user(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profile
  UPDATE public.profiles
  SET
    is_active = true,
    deactivated_at = NULL,
    deactivated_by = NULL
  WHERE id = p_target_user_id;

  -- Log event with actor/target separation
  INSERT INTO public.user_events (
    user_id, 
    target_user_id, 
    actor_user_id, 
    event_type, 
    status,
    metadata
  ) VALUES (
    p_target_user_id,
    p_target_user_id,
    auth.uid(),
    'ACCOUNT_REACTIVATED',
    'SUCCESS',
    jsonb_build_object('reason', 'Admin action')
  );
END;
$$;

-- ============================================================
-- PHASE 8: Create RPC for paginated audit log query (Admin)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_audit_logs(
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_event_type text DEFAULT NULL,
  p_target_user_id uuid DEFAULT NULL,
  p_actor_user_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  event_type text,
  occurred_at timestamptz,
  target_user_id uuid,
  target_user_name text,
  target_user_email text,
  actor_user_id uuid,
  actor_user_name text,
  actor_user_email text,
  source text,
  status text,
  metadata jsonb,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
BEGIN
  -- Security check: only admins can access this
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'owner')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get total count for pagination
  SELECT COUNT(*) INTO v_total
  FROM public.user_events ue
  WHERE (p_event_type IS NULL OR ue.event_type = p_event_type)
    AND (p_target_user_id IS NULL OR ue.target_user_id = p_target_user_id)
    AND (p_actor_user_id IS NULL OR ue.actor_user_id = p_actor_user_id)
    AND (p_status IS NULL OR ue.status = p_status)
    AND (p_start_date IS NULL OR ue.occurred_at >= p_start_date)
    AND (p_end_date IS NULL OR ue.occurred_at <= p_end_date);

  -- Return paginated results with user info
  RETURN QUERY
  SELECT 
    ue.id,
    ue.event_type,
    ue.occurred_at,
    ue.target_user_id,
    tp.name as target_user_name,
    tp.email as target_user_email,
    ue.actor_user_id,
    ap.name as actor_user_name,
    ap.email as actor_user_email,
    ue.source,
    ue.status,
    ue.metadata,
    v_total as total_count
  FROM public.user_events ue
  LEFT JOIN public.profiles tp ON tp.id = ue.target_user_id
  LEFT JOIN public.profiles ap ON ap.id = ue.actor_user_id
  WHERE (p_event_type IS NULL OR ue.event_type = p_event_type)
    AND (p_target_user_id IS NULL OR ue.target_user_id = p_target_user_id)
    AND (p_actor_user_id IS NULL OR ue.actor_user_id = p_actor_user_id)
    AND (p_status IS NULL OR ue.status = p_status)
    AND (p_start_date IS NULL OR ue.occurred_at >= p_start_date)
    AND (p_end_date IS NULL OR ue.occurred_at <= p_end_date)
  ORDER BY ue.occurred_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================================
-- PHASE 9: Create RPC for role change logging
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_change_user_role(
  p_target_user_id uuid,
  p_new_role text,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_role text;
BEGIN
  -- Get current role
  SELECT role INTO v_old_role 
  FROM public.user_roles 
  WHERE user_id = p_target_user_id;

  -- Update role
  UPDATE public.user_roles
  SET role = p_new_role, updated_at = now()
  WHERE user_id = p_target_user_id;

  -- If no row updated, insert
  IF NOT FOUND THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_target_user_id, p_new_role);
    v_old_role := 'none';
  END IF;

  -- Log the change
  INSERT INTO public.user_events (
    user_id, 
    target_user_id, 
    actor_user_id, 
    event_type, 
    status,
    metadata
  ) VALUES (
    p_target_user_id,
    p_target_user_id,
    auth.uid(),
    'ROLE_CHANGED',
    'SUCCESS',
    jsonb_build_object(
      'old_role', v_old_role,
      'new_role', p_new_role,
      'reason', p_reason
    )
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.log_user_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_change_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_deactivate_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reactivate_user TO authenticated;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
