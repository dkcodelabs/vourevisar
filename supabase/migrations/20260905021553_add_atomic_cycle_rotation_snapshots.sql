-- Fecha giros do ciclo de forma atomica e torna os snapshots imutaveis para o cliente.

drop policy if exists "Users can manage their own cycle rotation snapshots"
  on public.cycle_rotation_snapshots;
drop policy if exists "Users can view their own cycle rotation snapshots"
  on public.cycle_rotation_snapshots;

revoke all on table public.cycle_rotation_snapshots from anon, authenticated;
grant select on table public.cycle_rotation_snapshots to authenticated;

create policy "Users can view their own cycle rotation snapshots"
  on public.cycle_rotation_snapshots
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.advance_cycle_rotation(
  p_user_id uuid,
  p_user_cycle_id uuid,
  p_subject_id uuid,
  p_expected_cycle_number integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cycle public.user_cycles%rowtype;
  v_updated_cycle public.user_cycles%rowtype;
  v_now timestamptz := now();
  v_actual_cycle_number integer;
  v_cycle_subject_ids text[] := '{}'::text[];
  v_studied_subject_ids text[] := '{}'::text[];
  v_active_subject_ids text[] := '{}'::text[];
  v_rotation_completed boolean := false;
  v_snapshot_id uuid;
  v_subject_count integer := 0;
  v_studied_subject_count integer := 0;
  v_topics_started_count integer := 0;
  v_topics_completed_count integer := 0;
  v_edital_ids text[] := '{}'::text[];
  v_per_subject jsonb := '[]'::jsonb;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_expected_cycle_number is null or p_expected_cycle_number < 1 then
    raise exception 'Invalid expected cycle number' using errcode = '22023';
  end if;

  select *
    into v_cycle
  from public.user_cycles
  where id = p_user_cycle_id
    and user_id = p_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Active cycle not found' using errcode = 'P0002';
  end if;

  v_actual_cycle_number := coalesce(v_cycle.ciclos_realizados, 0) + 1;

  -- Retry depois de um fechamento bem-sucedido: devolve o snapshot existente
  -- sem marcar a materia no giro seguinte.
  if p_expected_cycle_number < v_actual_cycle_number then
    select id
      into v_snapshot_id
    from public.cycle_rotation_snapshots
    where user_id = p_user_id
      and user_cycle_id = p_user_cycle_id
      and cycle_number = p_expected_cycle_number;

    return jsonb_build_object(
      'ok', true,
      'already_studied', true,
      'rotation_completed', true,
      'completed_cycle_number', p_expected_cycle_number,
      'next_cycle_number', v_actual_cycle_number,
      'snapshot_id', v_snapshot_id,
      'cycle', to_jsonb(v_cycle)
    );
  end if;

  if p_expected_cycle_number > v_actual_cycle_number then
    raise exception 'Cycle state is stale' using errcode = '40001';
  end if;

  -- Remove IDs que ja nao pertencem ao usuario, preservando a ordem salva.
  select coalesce(array_agg(item.subject_id order by item.position), '{}'::text[])
    into v_cycle_subject_ids
  from unnest(coalesce(v_cycle.ciclo_atual, '{}'::text[])) with ordinality
    as item(subject_id, position)
  join public.subjects subject
    on subject.id::text = item.subject_id
   and subject.user_id = p_user_id;

  if not (p_subject_id::text = any(v_cycle_subject_ids)) then
    raise exception 'Subject does not belong to active cycle' using errcode = '22023';
  end if;

  select coalesce(array_agg(item.subject_id order by item.position), '{}'::text[])
    into v_studied_subject_ids
  from unnest(v_cycle_subject_ids) with ordinality as item(subject_id, position)
  where item.subject_id = p_subject_id::text
     or item.subject_id = any(coalesce(v_cycle.materias_estudadas_ciclo, '{}'::text[]));

  select coalesce(array_agg(item.subject_id order by item.position), '{}'::text[])
    into v_active_subject_ids
  from unnest(v_cycle_subject_ids) with ordinality as item(subject_id, position)
  join public.subjects subject on subject.id::text = item.subject_id
  where exists (
    select 1
    from public.topics topic
    where topic.subject_id = subject.id
      and coalesce(topic.is_active, true)
      and not coalesce(topic.is_hidden, false)
      and not (
        topic.completed
        or topic.review_stage in ('Concluído', '60d')
        or topic.review_count >= 5
      )
  );

  v_rotation_completed := not exists (
    select 1
    from unnest(v_active_subject_ids) active_subject_id
    where not (active_subject_id = any(v_studied_subject_ids))
  );

  if not v_rotation_completed then
    update public.user_cycles
    set ciclo_atual = v_cycle_subject_ids,
        materias_estudadas_ciclo = v_studied_subject_ids,
        atualizado_em = v_now
    where id = v_cycle.id
    returning * into v_updated_cycle;

    return jsonb_build_object(
      'ok', true,
      'already_studied', p_subject_id::text = any(coalesce(v_cycle.materias_estudadas_ciclo, '{}'::text[])),
      'rotation_completed', false,
      'completed_cycle_number', null,
      'next_cycle_number', v_actual_cycle_number,
      'snapshot_id', null,
      'cycle', to_jsonb(v_updated_cycle)
    );
  end if;

  with subject_metrics as (
    select
      item.position,
      subject.id,
      subject.name,
      subject.edital_id,
      item.subject_id = any(v_studied_subject_ids) as studied_in_cycle,
      count(topic.id)::int as total_topics,
      count(topic.id) filter (
        where topic.first_studied_at >= coalesce(v_cycle.data_inicio_ciclo, v_now)
          and topic.first_studied_at <= v_now
      )::int as topics_started,
      count(topic.id) filter (
        where (
          topic.completed
          or topic.review_stage in ('Concluído', '60d')
          or topic.review_count >= 5
        )
          and topic.last_reviewed_at >= coalesce(v_cycle.data_inicio_ciclo, v_now)
          and topic.last_reviewed_at <= v_now
      )::int as topics_completed
    from unnest(v_cycle_subject_ids) with ordinality as item(subject_id, position)
    join public.subjects subject
      on subject.id::text = item.subject_id
     and subject.user_id = p_user_id
    left join public.topics topic
      on topic.subject_id = subject.id
     and coalesce(topic.is_active, true)
     and not coalesce(topic.is_hidden, false)
    group by item.position, item.subject_id, subject.id, subject.name, subject.edital_id
  )
  select
    count(*)::int,
    count(*) filter (where studied_in_cycle)::int,
    coalesce(sum(topics_started), 0)::int,
    coalesce(sum(topics_completed), 0)::int,
    coalesce(array_agg(distinct edital_id::text) filter (where edital_id is not null), '{}'::text[]),
    coalesce(jsonb_agg(
      jsonb_build_object(
        'subject_id', id,
        'subject_name', name,
        'total_topics', total_topics,
        'topics_started', topics_started,
        'topics_completed', topics_completed,
        'studied_in_cycle', studied_in_cycle
      ) order by position
    ), '[]'::jsonb)
  into
    v_subject_count,
    v_studied_subject_count,
    v_topics_started_count,
    v_topics_completed_count,
    v_edital_ids,
    v_per_subject
  from subject_metrics;

  insert into public.cycle_rotation_snapshots (
    user_id,
    user_cycle_id,
    cycle_number,
    started_at,
    completed_at,
    subject_count,
    studied_subject_count,
    topics_started_count,
    topics_completed_count,
    studied_subject_ids,
    cycle_subject_ids,
    edital_ids,
    per_subject
  ) values (
    p_user_id,
    v_cycle.id,
    v_actual_cycle_number,
    v_cycle.data_inicio_ciclo,
    v_now,
    v_subject_count,
    v_studied_subject_count,
    v_topics_started_count,
    v_topics_completed_count,
    v_studied_subject_ids,
    v_cycle_subject_ids,
    v_edital_ids,
    v_per_subject
  )
  on conflict (user_cycle_id, cycle_number) do nothing
  returning id into v_snapshot_id;

  if v_snapshot_id is null then
    select id
      into v_snapshot_id
    from public.cycle_rotation_snapshots
    where user_cycle_id = v_cycle.id
      and cycle_number = v_actual_cycle_number;
  end if;

  update public.user_cycles
  set ciclo_atual = v_cycle_subject_ids,
      materias_estudadas_ciclo = '{}'::text[],
      ciclos_realizados = v_actual_cycle_number,
      data_inicio_ciclo = v_now,
      data_fim_ciclo = null,
      atualizado_em = v_now
  where id = v_cycle.id
  returning * into v_updated_cycle;

  return jsonb_build_object(
    'ok', true,
    'already_studied', p_subject_id::text = any(coalesce(v_cycle.materias_estudadas_ciclo, '{}'::text[])),
    'rotation_completed', true,
    'completed_cycle_number', v_actual_cycle_number,
    'next_cycle_number', v_actual_cycle_number + 1,
    'snapshot_id', v_snapshot_id,
    'cycle', to_jsonb(v_updated_cycle)
  );
end;
$$;

revoke all on function public.advance_cycle_rotation(uuid, uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.advance_cycle_rotation(uuid, uuid, uuid, integer)
  to service_role;

create or replace function public.user_rpc_dispatch(
  p_action text,
  p_args jsonb default '{}'::jsonb,
  p_actor_user_id uuid default null::uuid
) returns jsonb
language plpgsql
security definer
set search_path = 'public'
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
    when 'advance_cycle_rotation' then
      select public.advance_cycle_rotation(
        (p_args->>'p_user_id')::uuid,
        (p_args->>'p_user_cycle_id')::uuid,
        (p_args->>'p_subject_id')::uuid,
        (p_args->>'p_expected_cycle_number')::integer
      ) into v_result;
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
    when 'revert_subject_merge' then
      select to_jsonb(public.revert_subject_merge(
        (p_args->>'p_user_id')::uuid,
        (p_args->>'p_merge_id')::uuid
      )) into v_result;
    when 'revert_topic_merge' then
      select to_jsonb(public.revert_topic_merge(
        (p_args->>'p_user_id')::uuid,
        (p_args->>'p_merge_id')::uuid
      )) into v_result;
    when 'get_my_auth_methods' then
      select public.get_my_auth_methods() into v_result;
    when 'get_stripe_billing_overview' then
      select public.get_stripe_billing_overview(
        coalesce((p_args->>'p_livemode')::boolean, false)
      ) into v_result;
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
        p_args->>'p_error_id', p_args->>'p_module', p_args->>'p_action',
        p_args->>'p_user_message', p_args->>'p_technical_message', p_args->>'p_code',
        p_args->>'p_severity', coalesce((p_args->>'p_retryable')::boolean, false),
        nullif(p_args->>'p_actor_user_id', '')::uuid, coalesce(p_args->'p_metadata', '{}'::jsonb),
        p_args->>'p_fingerprint', p_args->>'p_scope', p_args->>'p_category',
        p_args->>'p_recoverability', coalesce((p_args->>'p_is_user_visible')::boolean, false),
        p_args->>'p_recommended_action', p_args->>'p_fingerprint_version', p_args->>'p_environment',
        p_args->>'p_route_path', p_args->>'p_feature_area', p_args->>'p_actor_email',
        nullif(p_args->>'p_target_user_id', '')::uuid, p_args->>'p_target_email',
        p_args->>'p_session_id', p_args->>'p_request_id', p_args->>'p_context_label'
      )) into v_result;
    when 'log_user_event' then
      select to_jsonb(public.log_user_event(
        p_args->>'p_event_type', (p_args->>'p_target_user_id')::uuid,
        (p_args->>'p_actor_user_id')::uuid, p_args->>'p_origin',
        coalesce(p_args->'p_metadata', '{}'::jsonb), p_args->>'p_status'
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

alter function public.user_rpc_dispatch(text, jsonb, uuid) owner to postgres;
