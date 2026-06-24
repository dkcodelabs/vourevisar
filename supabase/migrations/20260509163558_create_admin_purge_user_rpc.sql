
-- RPC para exclusão completa de um usuário do sistema
-- Apenas owners/admins podem executar esta função
-- Remove TODOS os dados do usuário e deleta o auth user
CREATE OR REPLACE FUNCTION public.admin_purge_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  target_email text;
BEGIN
  -- 1. Verificar se o caller é admin ou owner
  SELECT role INTO caller_role 
  FROM public.user_roles 
  WHERE user_id = auth.uid();
  
  IF caller_role IS NULL OR caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Permissão negada. Apenas administradores podem excluir usuários.';
  END IF;

  -- 2. Verificar se o alvo não é um usuário protegido
  SELECT email INTO target_email 
  FROM auth.users 
  WHERE id = target_user_id;
  
  IF target_email IN ('vourevisar@gmail.com', 'darciliok@gmail.com') THEN
    RAISE EXCEPTION 'Este usuário é protegido e não pode ser excluído.';
  END IF;

  -- 3. Impedir auto-exclusão
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Não é possível excluir sua própria conta.';
  END IF;

  -- 4. Deletar dados de TODAS as tabelas com user_id
  -- Ordem: tabelas dependentes primeiro, tabelas principais depois

  -- Ciclo de estudos v2
  DELETE FROM public.cycle_study_logs WHERE user_id = target_user_id;
  DELETE FROM public.cycle_subject_states WHERE user_id = target_user_id;
  -- cycle_rotations depende de study_cycles_v2, deletar antes
  DELETE FROM public.cycle_rotations WHERE cycle_id IN (
    SELECT id FROM public.study_cycles_v2 WHERE user_id = target_user_id
  );
  DELETE FROM public.study_cycles_v2 WHERE user_id = target_user_id;

  -- Tópicos (dependem de subjects que dependem de editais)
  DELETE FROM public.topic_review_history WHERE user_id = target_user_id;
  DELETE FROM public.topic_merges WHERE user_id = target_user_id;
  DELETE FROM public.question_attempts WHERE user_id = target_user_id;
  
  -- Tópicos vinculados aos subjects do usuário
  DELETE FROM public.topics WHERE subject_id IN (
    SELECT id FROM public.subjects WHERE user_id = target_user_id
  );
  
  -- Subjects e merges
  DELETE FROM public.subject_merges WHERE user_id = target_user_id;
  DELETE FROM public.subject_relations WHERE user_id = target_user_id;
  DELETE FROM public.pending_merge_suggestions WHERE user_id = target_user_id;
  DELETE FROM public.subjects WHERE user_id = target_user_id;

  -- Editais
  DELETE FROM public.pending_ai_extractions WHERE user_id = target_user_id;
  DELETE FROM public.edital_suggestions WHERE user_id = target_user_id;
  DELETE FROM public.pending_cycle_merges WHERE user_id = target_user_id;
  DELETE FROM public.user_editais WHERE user_id = target_user_id;

  -- Ciclo de estudos (legacy)
  DELETE FROM public.user_cycles WHERE user_id = target_user_id;

  -- Estudo e sessões
  DELETE FROM public.study_sessions WHERE user_id = target_user_id;
  DELETE FROM public.pomodoro_sessions WHERE user_id = target_user_id;
  DELETE FROM public.active_study_timers WHERE user_id = target_user_id;
  DELETE FROM public.user_study_analytics WHERE user_id = target_user_id;

  -- Notas e lembretes
  DELETE FROM public.general_notes WHERE user_id = target_user_id;
  DELETE FROM public.general_reminders WHERE user_id = target_user_id;

  -- Notificações
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  DELETE FROM public.user_notifications WHERE user_id = target_user_id;

  -- Assinatura e pagamentos
  DELETE FROM public.coupon_uses WHERE user_id = target_user_id;
  DELETE FROM public.payment_history WHERE user_id = target_user_id;
  DELETE FROM public.user_subscriptions WHERE user_id = target_user_id;

  -- Eventos e logs do usuário
  DELETE FROM public.user_events WHERE user_id = target_user_id;
  DELETE FROM public.api_usage WHERE user_id = target_user_id;

  -- Posts e comentários (por author_id)
  DELETE FROM public.comments WHERE author_id = target_user_id;
  DELETE FROM public.posts WHERE author_id = target_user_id;

  -- Admin/feedback (actor_user_id e target_user_id)
  DELETE FROM public.admin_error_events WHERE target_user_id = admin_purge_user.target_user_id;
  DELETE FROM public.user_feedback_events WHERE actor_user_id = target_user_id;
  DELETE FROM public.ai_error_logs WHERE user_id = target_user_id;

  -- Configurações e roles
  DELETE FROM public.user_settings WHERE user_id = target_user_id;
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  DELETE FROM public.organization_members WHERE user_id = target_user_id;

  -- User difficulty overview (materialized/view data)
  DELETE FROM public.user_difficulty_overview WHERE user_id = target_user_id;

  -- Audit logs (registrar a ação antes de deletar os logs do usuário)
  INSERT INTO public.audit_logs (user_id, action, details)
  VALUES (auth.uid(), 'admin_purge_user', jsonb_build_object(
    'purged_user_id', target_user_id,
    'purged_email', target_email,
    'purged_at', now()
  ));
  
  -- Deletar audit logs DO USUÁRIO (não os logs sobre o usuário)
  DELETE FROM public.audit_logs WHERE user_id = target_user_id;

  -- Profile (último pois pode ter FK)
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 5. Deletar o auth user (SECURITY DEFINER permite isso)
  DELETE FROM auth.users WHERE id = target_user_id;

END;
$$;

-- Revogar acesso público e conceder apenas ao authenticated
REVOKE ALL ON FUNCTION public.admin_purge_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_purge_user(uuid) TO authenticated;

COMMENT ON FUNCTION public.admin_purge_user IS 'Exclusão completa e irreversível de um usuário. Remove todos os dados de todas as tabelas e deleta o auth user. Apenas owners/admins.';
;
