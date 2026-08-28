
-- Remover a versão anterior
DROP FUNCTION IF EXISTS public.admin_purge_user(uuid);

-- Recriar sem tentar deletar da view user_difficulty_overview
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
  -- 1. Verificar permissões
  SELECT role INTO v_caller_role FROM public.user_roles WHERE user_id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Permissão negada.';
  END IF;

  -- 2. Verificar usuário protegido
  SELECT email INTO v_target_email FROM auth.users WHERE id = p_target_user_id;
  IF v_target_email IN ('vourevisar@gmail.com', 'darciliok@gmail.com') THEN
    RAISE EXCEPTION 'Usuário protegido.';
  END IF;

  -- 3. Impedir auto-exclusão
  IF p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Auto-exclusão não permitida.';
  END IF;

  -- 4. Deletar dados reais das tabelas
  
  -- Ciclo v2
  DELETE FROM public.cycle_study_logs WHERE user_id = p_target_user_id;
  DELETE FROM public.cycle_subject_states WHERE user_id = p_target_user_id;
  DELETE FROM public.cycle_rotations WHERE cycle_id IN (SELECT id FROM public.study_cycles_v2 WHERE user_id = p_target_user_id);
  DELETE FROM public.study_cycles_v2 WHERE user_id = p_target_user_id;

  -- Reviews e Questões
  DELETE FROM public.topic_review_history WHERE user_id = p_target_user_id;
  DELETE FROM public.topic_merges WHERE user_id = p_target_user_id;
  DELETE FROM public.question_attempts WHERE user_id = p_target_user_id;
  DELETE FROM public.topics WHERE subject_id IN (SELECT id FROM public.subjects WHERE user_id = p_target_user_id);
  
  -- Matérias e Merges
  DELETE FROM public.subject_merges WHERE user_id = p_target_user_id;
  DELETE FROM public.subject_relations WHERE user_id = p_target_user_id;
  DELETE FROM public.pending_merge_suggestions WHERE user_id = p_target_user_id;
  DELETE FROM public.subjects WHERE user_id = p_target_user_id;

  -- Editais e IA
  DELETE FROM public.pending_ai_extractions WHERE user_id = p_target_user_id;
  DELETE FROM public.edital_suggestions WHERE user_id = p_target_user_id;
  DELETE FROM public.pending_cycle_merges WHERE user_id = p_target_user_id;
  DELETE FROM public.user_editais WHERE user_id = p_target_user_id;

  -- Legacy e Analytics
  DELETE FROM public.user_cycles WHERE user_id = p_target_user_id;
  DELETE FROM public.study_sessions WHERE user_id = p_target_user_id;
  DELETE FROM public.pomodoro_sessions WHERE user_id = p_target_user_id;
  DELETE FROM public.active_study_timers WHERE user_id = p_target_user_id;
  DELETE FROM public.user_study_analytics WHERE user_id = p_target_user_id;

  -- Notas, Lembretes e Notificações
  DELETE FROM public.general_notes WHERE user_id = p_target_user_id;
  DELETE FROM public.general_reminders WHERE user_id = p_target_user_id;
  DELETE FROM public.notifications WHERE user_id = p_target_user_id;
  DELETE FROM public.user_notifications WHERE user_id = p_target_user_id;

  -- Financeiro
  DELETE FROM public.coupon_uses WHERE user_id = p_target_user_id;
  DELETE FROM public.payment_history WHERE user_id = p_target_user_id;
  DELETE FROM public.user_subscriptions WHERE user_id = p_target_user_id;

  -- Logs e Eventos
  DELETE FROM public.user_events WHERE user_id = p_target_user_id;
  DELETE FROM public.api_usage WHERE user_id = p_target_user_id;
  DELETE FROM public.comments WHERE author_id = p_target_user_id;
  DELETE FROM public.posts WHERE author_id = p_target_user_id;
  DELETE FROM public.admin_error_events WHERE target_user_id = p_target_user_id;
  DELETE FROM public.user_feedback_events WHERE actor_user_id = p_target_user_id;

  -- Configurações e Roles
  DELETE FROM public.user_settings WHERE user_id = p_target_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_target_user_id;
  DELETE FROM public.organization_members WHERE user_id = p_target_user_id;

  -- Audit Log da ação
  INSERT INTO public.audit_logs (user_id, action, details)
  VALUES (auth.uid(), 'admin_purge_user', jsonb_build_object(
    'purged_user_id', p_target_user_id,
    'purged_email', v_target_email,
    'purged_at', now()
  ));
  
  -- Limpar logs do usuário excluído
  DELETE FROM public.audit_logs WHERE user_id = p_target_user_id;

  -- Profile e Auth
  DELETE FROM public.profiles WHERE id = p_target_user_id;
  DELETE FROM auth.users WHERE id = p_target_user_id;

END;
$$;

-- Permissões
REVOKE ALL ON FUNCTION public.admin_purge_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_purge_user(uuid) TO authenticated;
;
