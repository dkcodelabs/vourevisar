create or replace function public.atomic_cycle_load(
  p_user_id uuid,
  p_new_edital_id uuid,
  p_new_subject_ids text[],
  p_old_edital_ids uuid[],
  p_mode text,
  p_cycle_name text default null,
  p_exam_date date default null,
  p_reset_cycle_state boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_cycle_id uuid;
  v_old_id uuid;
  v_archived_at timestamptz;
  v_now timestamptz := now();
  v_resumed_reviews integer := 0;
  v_cycle_name text := left(coalesce(nullif(trim(p_cycle_name), ''), 'Ciclo de estudos'), 160);
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_mode not in ('replace', 'merge') then
    raise exception 'Invalid cycle load mode' using errcode = '22023';
  end if;

  select cycle_archived_at into v_archived_at
  from public.user_editais
  where id = p_new_edital_id
    and user_id = p_user_id;

  if not found then
    raise exception 'Edital not found for authenticated user' using errcode = 'P0002';
  end if;

  if p_mode = 'replace' and array_length(p_old_edital_ids, 1) > 0 then
    foreach v_old_id in array p_old_edital_ids loop
      update public.user_editais
      set merged_into_cycle = false,
          active_subject_ids = '{}',
          cycle_archived_at = coalesce(cycle_archived_at, v_now)
      where id = v_old_id
        and user_id = p_user_id;
    end loop;
  end if;

  select id into v_cycle_id
  from public.user_cycles
  where user_id = p_user_id
  limit 1;

  if p_reset_cycle_state and v_cycle_id is not null then
    delete from public.cycle_study_events
    where user_id = p_user_id
      and user_cycle_id = v_cycle_id;

    delete from public.cycle_rotation_snapshots
    where user_id = p_user_id
      and user_cycle_id = v_cycle_id;
  end if;

  if v_cycle_id is not null then
    update public.user_cycles
    set ciclo_atual = p_new_subject_ids,
        name = v_cycle_name,
        exam_date = p_exam_date,
        ciclos_realizados = case when p_reset_cycle_state then 0 else ciclos_realizados end,
        materias_estudadas_ciclo = case when p_reset_cycle_state then '{}'::text[] else materias_estudadas_ciclo end,
        indice_atual = case when p_reset_cycle_state then 0 else indice_atual end,
        data_inicio_ciclo = case when p_reset_cycle_state then v_now else data_inicio_ciclo end,
        data_fim_ciclo = case when p_reset_cycle_state then null else data_fim_ciclo end,
        atualizado_em = v_now
    where id = v_cycle_id;
  else
    insert into public.user_cycles (
      user_id,
      ciclo_atual,
      name,
      exam_date,
      ciclos_realizados,
      materias_estudadas_ciclo,
      indice_atual,
      data_inicio_ciclo,
      data_fim_ciclo,
      atualizado_em
    )
    values (
      p_user_id,
      p_new_subject_ids,
      v_cycle_name,
      p_exam_date,
      0,
      '{}'::text[],
      0,
      v_now,
      null,
      v_now
    )
    returning id into v_cycle_id;
  end if;

  if v_archived_at is not null and v_archived_at < v_now then
    update public.topics
    set next_review = next_review + (v_now - v_archived_at)
    where edital_id = p_new_edital_id
      and completed = false
      and next_review is not null;

    get diagnostics v_resumed_reviews = row_count;
  end if;

  update public.user_editais
  set merged_into_cycle = true,
      active_subject_ids = p_new_subject_ids,
      cycle_archived_at = null
  where id = p_new_edital_id
    and user_id = p_user_id;

  return jsonb_build_object(
    'ok', true,
    'cycle_id', v_cycle_id,
    'cycle_name', v_cycle_name,
    'cycle_exam_date', p_exam_date,
    'resumed_reviews', v_resumed_reviews,
    'cycle_state_reset', p_reset_cycle_state
  );
end;
$function$;

revoke all on function public.atomic_cycle_load(uuid, uuid, text[], uuid[], text, text, date, boolean) from public;
revoke all on function public.atomic_cycle_load(uuid, uuid, text[], uuid[], text, text, date, boolean) from anon;
revoke all on function public.atomic_cycle_load(uuid, uuid, text[], uuid[], text, text, date, boolean) from authenticated;
grant execute on function public.atomic_cycle_load(uuid, uuid, text[], uuid[], text, text, date, boolean) to service_role;

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
        nullif(p_args->>'p_exam_date', '')::date,
        coalesce((p_args->>'p_reset_cycle_state')::boolean, false)
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
