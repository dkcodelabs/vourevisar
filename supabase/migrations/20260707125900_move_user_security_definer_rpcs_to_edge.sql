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

revoke all on function public.atomic_archive_edital_from_cycle(uuid, uuid) from authenticated;
revoke all on function public.atomic_cycle_load(uuid, uuid, text[], uuid[], text, text, date) from authenticated;
revoke all on function public.get_subscription_info(uuid) from authenticated;
revoke all on function public.get_unified_subject_name(uuid, uuid) from authenticated;
revoke all on function public.get_unified_topic_name(uuid, uuid) from authenticated;
revoke all on function public.get_user_ai_limits(uuid) from authenticated;
revoke all on function public.log_admin_error(text, text, text, text, text, text, text, boolean, uuid, jsonb, text, text, text, text, boolean, text, text, text, text, text, text, uuid, text, text, text, text) from authenticated;
revoke all on function public.log_user_event(text, uuid, uuid, text, jsonb, text) from authenticated;
revoke all on function public.sync_topic_merge_progress(uuid, uuid, jsonb, jsonb) from authenticated;
