-- ============================================================
-- AUDIT HARDENING - Phase 3
-- ============================================================
-- 1. SESSION_START idempotency (30 min)
-- 2. Backfill actor/target from legacy metadata
-- 3. Improved log_user_event with validation
-- ============================================================

-- ============================================================
-- PHASE 1: Backfill legacy data
-- ============================================================

-- Preencher target_user_id de user_id quando null
UPDATE public.user_events 
SET target_user_id = user_id 
WHERE target_user_id IS NULL AND user_id IS NOT NULL;

-- Preencher actor_user_id de metadata->>'admin_id' quando null
UPDATE public.user_events
SET actor_user_id = (metadata->>'admin_id')::uuid
WHERE actor_user_id IS NULL 
  AND metadata->>'admin_id' IS NOT NULL
  AND event_type IN ('ACCOUNT_DEACTIVATED', 'ACCOUNT_REACTIVATED', 'ROLE_CHANGED');

-- ============================================================
-- PHASE 2: Update log_user_event with SESSION_START idempotency
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
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_target uuid;
  v_actor uuid;
  v_existing_id bigint;
  v_idempotency_window interval := interval '30 minutes';
BEGIN
  v_user_id := auth.uid();
  
  -- Determine target: explicit param > current user
  v_target := COALESCE(p_target_user_id, v_user_id);
  
  -- Determine actor: explicit param > current user (for self-actions)
  -- SECURITY: Never allow client to forge actor - always use auth.uid() as base
  v_actor := COALESCE(p_actor_user_id, v_user_id);
  
  -- =========================================================
  -- SESSION_START IDEMPOTENCY
  -- Prevent duplicate SESSION_START within 30 min window
  -- =========================================================
  IF p_event_type = 'SESSION_START' THEN
    SELECT id INTO v_existing_id
    FROM public.user_events
    WHERE target_user_id = v_target
      AND event_type = 'SESSION_START'
      AND occurred_at > (now() - v_idempotency_window)
    ORDER BY occurred_at DESC
    LIMIT 1;
    
    IF v_existing_id IS NOT NULL THEN
      -- Already have a recent SESSION_START, skip insertion
      RETURN jsonb_build_object(
        'status', 'skipped',
        'reason', 'idempotency_window',
        'existing_id', v_existing_id
      );
    END IF;
  END IF;
  
  -- =========================================================
  -- INSERT EVENT
  -- =========================================================
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
  
  RETURN jsonb_build_object('status', 'inserted');
END;
$$;

-- ============================================================
-- PHASE 3: Update admin RPCs to enforce actor/target
-- ============================================================

-- Deactivate user - sempre com actor e target corretos
CREATE OR REPLACE FUNCTION public.admin_deactivate_user(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
BEGIN
  -- Validate: actor must exist and be admin
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Actor must be authenticated';
  END IF;

  -- Update profile
  UPDATE public.profiles
  SET
    is_active = false,
    deactivated_at = now(),
    deactivated_by = v_actor_id
  WHERE id = p_target_user_id;

  -- Log event with explicit actor/target
  INSERT INTO public.user_events (
    user_id, 
    target_user_id, 
    actor_user_id, 
    event_type, 
    status,
    source,
    metadata
  ) VALUES (
    p_target_user_id,
    p_target_user_id,
    v_actor_id,  -- Admin who performed the action
    'ACCOUNT_DEACTIVATED',
    'SUCCESS',
    'admin_panel',
    jsonb_build_object('reason', 'Admin action', 'admin_action', true)
  );
END;
$$;

-- Reactivate user - sempre com actor e target corretos
CREATE OR REPLACE FUNCTION public.admin_reactivate_user(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
BEGIN
  -- Validate: actor must exist and be admin
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Actor must be authenticated';
  END IF;

  -- Update profile
  UPDATE public.profiles
  SET
    is_active = true,
    deactivated_at = NULL,
    deactivated_by = NULL
  WHERE id = p_target_user_id;

  -- Log event with explicit actor/target
  INSERT INTO public.user_events (
    user_id, 
    target_user_id, 
    actor_user_id, 
    event_type, 
    status,
    source,
    metadata
  ) VALUES (
    p_target_user_id,
    p_target_user_id,
    v_actor_id,  -- Admin who performed the action
    'ACCOUNT_REACTIVATED',
    'SUCCESS',
    'admin_panel',
    jsonb_build_object('reason', 'Admin action', 'admin_action', true)
  );
END;
$$;

-- Change role - com actor e target, guarda old/new role
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
  v_actor_id uuid := auth.uid();
  v_old_role text;
BEGIN
  -- Validate: actor must exist
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Actor must be authenticated';
  END IF;

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

  -- Log the change with actor/target
  INSERT INTO public.user_events (
    user_id, 
    target_user_id, 
    actor_user_id, 
    event_type, 
    status,
    source,
    metadata
  ) VALUES (
    p_target_user_id,
    p_target_user_id,
    v_actor_id,  -- Admin who performed the action
    'ROLE_CHANGED',
    'SUCCESS',
    'admin_panel',
    jsonb_build_object(
      'old_role', v_old_role,
      'new_role', p_new_role,
      'reason', p_reason,
      'admin_action', true
    )
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.log_user_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_deactivate_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reactivate_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_change_user_role TO authenticated;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
