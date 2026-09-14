-- Keep the destructive admin action transactional while covering tables added
-- after the original purge function. The function is reached only through the
-- admin-rpc Edge Function, which authenticates the caller and invokes the
-- dispatcher with service_role.
CREATE OR REPLACE FUNCTION public.admin_purge_user(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_target_email text;
BEGIN
  SELECT role::text
    INTO v_caller_role
    FROM public.user_roles
   WHERE user_id = auth.uid()
     AND role IN ('owner', 'admin')
   LIMIT 1;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Permissão negada.';
  END IF;

  SELECT email INTO v_target_email
    FROM auth.users
   WHERE id = p_target_user_id;

  IF v_target_email IN ('vourevisar@gmail.com', 'darcili@gmail.com') THEN
    RAISE EXCEPTION 'Usuário protegido.';
  END IF;

  IF p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Auto-exclusão não permitida.';
  END IF;

  -- Remove records whose foreign keys still use RESTRICT, including the
  -- billing and practice modules added after the original implementation.
  DELETE FROM public.billing_refund_admin_actions
   WHERE billing_refund_request_id IN (
     SELECT id FROM public.billing_refund_requests WHERE user_id = p_target_user_id
   )
      OR actor_user_id = p_target_user_id;
  DELETE FROM public.billing_refund_requests WHERE user_id = p_target_user_id;
  DELETE FROM public.billing_plan_change_requests WHERE user_id = p_target_user_id;
  DELETE FROM public.billing_contract_acceptances WHERE user_id = p_target_user_id;
  DELETE FROM public.billing_subscriptions WHERE user_id = p_target_user_id;
  DELETE FROM public.billing_checkout_attempts WHERE user_id = p_target_user_id;
  DELETE FROM public.billing_customers WHERE user_id = p_target_user_id;
  DELETE FROM public.billing_access_grants WHERE user_id = p_target_user_id;
  DELETE FROM public.billing_affiliate_conversions WHERE user_id = p_target_user_id;

  DELETE FROM public.practice_attempts WHERE user_id = p_target_user_id;
  DELETE FROM public.practice_item_feedback WHERE user_id = p_target_user_id;
  DELETE FROM public.practice_item_reports WHERE user_id = p_target_user_id;
  DELETE FROM public.practice_session_items WHERE user_id = p_target_user_id;
  DELETE FROM public.practice_sessions WHERE user_id = p_target_user_id;
  DELETE FROM public.flashcard_schedules WHERE user_id = p_target_user_id;
  DELETE FROM public.practice_items
   WHERE package_id IN (
     SELECT id FROM public.practice_packages WHERE user_id = p_target_user_id
   );
  DELETE FROM public.practice_packages WHERE user_id = p_target_user_id;
  DELETE FROM public.topic_learning_signals WHERE user_id = p_target_user_id;
  DELETE FROM public.ai_extraction_jobs WHERE user_id = p_target_user_id;
  DELETE FROM public.ai_usage_logs WHERE user_id = p_target_user_id;
  DELETE FROM public.legal_document_acceptances WHERE user_id = p_target_user_id;

  DELETE FROM public.cycle_study_events WHERE user_id = p_target_user_id;
  DELETE FROM public.cycle_rotation_snapshots WHERE user_id = p_target_user_id;
  DELETE FROM public.cycle_study_logs WHERE user_id = p_target_user_id;
  DELETE FROM public.cycle_subject_states WHERE user_id = p_target_user_id;
  DELETE FROM public.cycle_rotations
   WHERE cycle_id IN (
     SELECT id FROM public.study_cycles_v2 WHERE user_id = p_target_user_id
   );
  DELETE FROM public.study_cycles_v2 WHERE user_id = p_target_user_id;

  DELETE FROM public.topic_review_history WHERE user_id = p_target_user_id;
  DELETE FROM public.topic_merges WHERE user_id = p_target_user_id;
  DELETE FROM public.subject_merges WHERE user_id = p_target_user_id;
  DELETE FROM public.subject_relations WHERE user_id = p_target_user_id;
  DELETE FROM public.question_attempts WHERE user_id = p_target_user_id;
  DELETE FROM public.topics WHERE subject_id IN (
    SELECT id FROM public.subjects WHERE user_id = p_target_user_id
  );
  DELETE FROM public.subjects WHERE user_id = p_target_user_id;
  DELETE FROM public.pending_ai_extractions WHERE user_id = p_target_user_id;
  DELETE FROM public.edital_suggestions WHERE user_id = p_target_user_id;
  DELETE FROM public.pending_cycle_merges WHERE user_id = p_target_user_id;
  DELETE FROM public.user_editais WHERE user_id = p_target_user_id;
  DELETE FROM public.user_cycles WHERE user_id = p_target_user_id;
  DELETE FROM public.edital_incidence_maps WHERE user_id = p_target_user_id;
  DELETE FROM public.study_sessions WHERE user_id = p_target_user_id;
  DELETE FROM public.pomodoro_sessions WHERE user_id = p_target_user_id;
  DELETE FROM public.active_study_timers WHERE user_id = p_target_user_id;
  DELETE FROM public.user_study_analytics WHERE user_id = p_target_user_id;
  DELETE FROM public.general_notes WHERE user_id = p_target_user_id;
  DELETE FROM public.general_reminders WHERE user_id = p_target_user_id;
  DELETE FROM public.notifications WHERE user_id = p_target_user_id;
  DELETE FROM public.user_notifications WHERE user_id = p_target_user_id;
  DELETE FROM public.coupon_uses WHERE user_id = p_target_user_id;
  DELETE FROM public.user_ai_quota_resets WHERE user_id = p_target_user_id;
  DELETE FROM public.user_events WHERE user_id = p_target_user_id;

  -- Remove authored social data without violating the self-referencing
  -- comments FK when another user's comment replies to this user.
  UPDATE public.comments
     SET parent_id = NULL
   WHERE parent_id IN (SELECT id FROM public.comments WHERE author_id = p_target_user_id);
  DELETE FROM public.comments WHERE author_id = p_target_user_id;
  DELETE FROM public.posts WHERE author_id = p_target_user_id;

  DELETE FROM public.admin_error_events WHERE target_user_id = p_target_user_id;
  UPDATE public.admin_error_events SET actor_user_id = NULL, assigned_to = NULL
   WHERE actor_user_id = p_target_user_id OR assigned_to = p_target_user_id;
  DELETE FROM public.user_feedback_events WHERE actor_user_id = p_target_user_id;
  UPDATE public.user_feedback_events SET assigned_to = NULL
   WHERE assigned_to = p_target_user_id;
  DELETE FROM public.incident_action_log WHERE actor_user_id = p_target_user_id;
  UPDATE public.admin_alert_events SET acknowledged_by = NULL
   WHERE acknowledged_by = p_target_user_id;
  UPDATE public.public_editais SET created_by = NULL
   WHERE created_by = p_target_user_id;
  UPDATE public.system_settings SET updated_by = NULL
   WHERE updated_by = p_target_user_id;
  UPDATE public.user_roles SET assigned_by = NULL
   WHERE assigned_by = p_target_user_id;
  DELETE FROM public.audit_logs WHERE user_id = p_target_user_id;

  DELETE FROM public.organization_members WHERE user_id = p_target_user_id;
  DELETE FROM public.organizations WHERE owner_id = p_target_user_id;
  DELETE FROM public.user_settings WHERE user_id = p_target_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_target_user_id;
  INSERT INTO public.audit_logs (user_id, action, table_name, changes)
  VALUES (auth.uid(), 'admin_purge_user', 'auth.users', jsonb_build_object(
    'purged_user_id', p_target_user_id,
    'purged_email', v_target_email,
    'purged_at', now()
  ));
  DELETE FROM public.audit_logs WHERE user_id = p_target_user_id;
  DELETE FROM public.profiles WHERE id = p_target_user_id;
  DELETE FROM auth.users WHERE id = p_target_user_id;
END;
$$;

ALTER FUNCTION public.admin_purge_user(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_purge_user(uuid) FROM public, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_purge_user(uuid) TO service_role;
