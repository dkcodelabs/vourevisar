create or replace function public.reset_edital_study_progress(
  p_user_id uuid,
  p_edital_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_subject_ids text[] := '{}';
  v_topic_ids text[] := '{}';
  v_reset_topics integer := 0;
  v_deleted_history integer := 0;
  v_deleted_sessions integer := 0;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select coalesce(subject_ids, '{}'::text[])
    into v_subject_ids
  from public.user_editais
  where id = p_edital_id
    and user_id = p_user_id;

  if not found then
    raise exception 'Edital not found for authenticated user' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(id::text), '{}'::text[])
    into v_topic_ids
  from public.topics
  where subject_id::text = any(v_subject_ids)
     or edital_id = p_edital_id;

  if array_length(v_topic_ids, 1) is null then
    return jsonb_build_object(
      'ok', true,
      'reset_topics', 0,
      'deleted_history', 0,
      'deleted_sessions', 0
    );
  end if;

  delete from public.topic_review_history
  where user_id = p_user_id
    and topic_id::text = any(v_topic_ids);
  get diagnostics v_deleted_history = row_count;

  delete from public.study_sessions
  where user_id = p_user_id
    and (
      edital_id = p_edital_id
      or subject_id::text = any(v_subject_ids)
      or coalesce(topics_studied, '{}'::text[]) && v_topic_ids
    );
  get diagnostics v_deleted_sessions = row_count;

  update public.topics
  set completed = false,
      review_count = 0,
      next_review = null,
      first_studied_at = null,
      last_reviewed_at = null,
      review_stage = null,
      difficulty_level = null,
      difficulty_set_at = null,
      memory_stability = null,
      current_interval = null,
      retention_score = null,
      total_reviews = null,
      last_session_duration = null,
      is_marked_for_review = false,
      marked_for_review_at = null,
      updated_at = now()
  where id::text = any(v_topic_ids);
  get diagnostics v_reset_topics = row_count;

  return jsonb_build_object(
    'ok', true,
    'reset_topics', v_reset_topics,
    'deleted_history', v_deleted_history,
    'deleted_sessions', v_deleted_sessions
  );
end;
$function$;

revoke all on function public.reset_edital_study_progress(uuid, uuid) from public;
revoke all on function public.reset_edital_study_progress(uuid, uuid) from anon;
revoke all on function public.reset_edital_study_progress(uuid, uuid) from authenticated;
grant execute on function public.reset_edital_study_progress(uuid, uuid) to service_role;

create or replace function public.user_rpc_dispatch(
  p_action text,
  p_args jsonb default '{}'::jsonb,
  p_actor_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if p_actor_user_id is null then
    raise exception 'User RPC actor is required';
  end if;

  perform set_config('request.jwt.claim.sub', p_actor_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  case p_action
    when 'atomic_archive_edital_from_cycle' then
      select to_jsonb(public.atomic_archive_edital_from_cycle(
        (p_args->>'p_user_id')::uuid,
        (p_args->>'p_edital_id')::uuid
      )) into v_result;

    when 'atomic_cycle_load' then
      select to_jsonb(public.atomic_cycle_load(
        (p_args->>'p_user_id')::uuid,
        (p_args->>'p_new_edital_id')::uuid,
        coalesce(array(select jsonb_array_elements_text(p_args->'p_new_subject_ids')), array[]::text[]),
        coalesce(array(select jsonb_array_elements_text(p_args->'p_old_edital_ids'))::uuid[], array[]::uuid[]),
        p_args->>'p_mode',
        p_args->>'p_cycle_name',
        nullif(p_args->>'p_exam_date', '')::date
      )) into v_result;

    when 'reset_edital_study_progress' then
      select to_jsonb(public.reset_edital_study_progress(
        (p_args->>'p_user_id')::uuid,
        (p_args->>'p_edital_id')::uuid
      )) into v_result;

    when 'get_subscription_info' then
      select to_jsonb(public.get_subscription_info(nullif(p_args->>'check_user_id', '')::uuid)) into v_result;

    when 'get_unified_subject_name' then
      select to_jsonb(public.get_unified_subject_name(
        (p_args->>'subject_id')::uuid,
        (p_args->>'user_id')::uuid
      )) into v_result;

    when 'get_unified_topic_name' then
      select to_jsonb(public.get_unified_topic_name(
        (p_args->>'topic_id')::uuid,
        (p_args->>'user_id')::uuid
      )) into v_result;

    when 'get_user_ai_limits' then
      select to_jsonb(public.get_user_ai_limits((p_args->>'p_user_id')::uuid)) into v_result;

    when 'log_admin_error' then
      select to_jsonb(public.log_admin_error(
        p_args->>'p_error_id',
        p_args->>'p_module',
        p_args->>'p_action',
        p_args->>'p_user_message',
        p_args->>'p_technical_message',
        p_args->>'p_code',
        p_args->>'p_severity',
        coalesce((p_args->>'p_retryable')::boolean, false),
        nullif(p_args->>'p_actor_user_id', '')::uuid,
        coalesce(p_args->'p_metadata', '{}'::jsonb),
        p_args->>'p_fingerprint',
        p_args->>'p_scope',
        p_args->>'p_category',
        p_args->>'p_recoverability',
        coalesce((p_args->>'p_is_user_visible')::boolean, false),
        p_args->>'p_recommended_action',
        p_args->>'p_fingerprint_version',
        p_args->>'p_environment',
        p_args->>'p_route_path',
        p_args->>'p_feature_area',
        p_args->>'p_actor_email',
        nullif(p_args->>'p_target_user_id', '')::uuid,
        p_args->>'p_target_email',
        p_args->>'p_session_id',
        p_args->>'p_request_id',
        p_args->>'p_context_label'
      )) into v_result;

    when 'log_user_event' then
      select to_jsonb(public.log_user_event(
        p_args->>'p_event_type',
        (p_args->>'p_target_user_id')::uuid,
        (p_args->>'p_actor_user_id')::uuid,
        p_args->>'p_origin',
        coalesce(p_args->'p_metadata', '{}'::jsonb),
        p_args->>'p_status'
      )) into v_result;

    when 'sync_topic_merge_progress' then
      select to_jsonb(public.sync_topic_merge_progress(
        (p_args->>'p_user_id')::uuid,
        (p_args->>'p_topic_id')::uuid,
        coalesce(p_args->'p_progress', '{}'::jsonb),
        p_args->'p_history'
      )) into v_result;

    else
      raise exception 'User RPC action is not allowed: %', p_action;
  end case;

  return v_result;
end;
$$;

revoke all on function public.user_rpc_dispatch(text, jsonb, uuid) from public;
revoke all on function public.user_rpc_dispatch(text, jsonb, uuid) from anon;
revoke all on function public.user_rpc_dispatch(text, jsonb, uuid) from authenticated;
grant execute on function public.user_rpc_dispatch(text, jsonb, uuid) to service_role;
