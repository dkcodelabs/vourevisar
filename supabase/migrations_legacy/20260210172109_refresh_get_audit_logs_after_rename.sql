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
$$;;
