create or replace function public.revert_topic_merge(
  p_user_id uuid,
  p_merge_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_merge public.topic_merges%rowtype;
  v_primary_topic public.topics%rowtype;
  v_merged_topic_ids uuid[] := '{}';
  v_all_topic_ids uuid[] := '{}';
  v_updated_topics integer := 0;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select *
    into v_merge
  from public.topic_merges
  where id = p_merge_id
    and user_id = p_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Topic merge not found for authenticated user' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(value::uuid), '{}'::uuid[])
    into v_merged_topic_ids
  from jsonb_array_elements_text(coalesce(v_merge.merged_topic_ids, '[]'::jsonb)) as value;

  v_all_topic_ids := array_prepend(v_merge.primary_topic_id, v_merged_topic_ids);

  if exists (
    select 1
    from public.topics topic
    join public.subjects subject on subject.id = topic.subject_id
    where topic.id = any(v_all_topic_ids)
      and subject.user_id is distinct from p_user_id
  ) then
    raise exception 'Topic merge contains topics outside authenticated user scope' using errcode = '42501';
  end if;

  select *
    into v_primary_topic
  from public.topics
  where id = v_merge.primary_topic_id
  for update;

  if found and array_length(v_merged_topic_ids, 1) > 0 then
    update public.topics
    set completed = v_primary_topic.completed,
        review_count = v_primary_topic.review_count,
        review_stage = v_primary_topic.review_stage,
        next_review = v_primary_topic.next_review,
        first_studied_at = v_primary_topic.first_studied_at,
        last_reviewed_at = v_primary_topic.last_reviewed_at,
        difficulty_level = v_primary_topic.difficulty_level,
        difficulty_set_at = v_primary_topic.difficulty_set_at,
        notes = v_primary_topic.notes,
        memory_stability = v_primary_topic.memory_stability,
        current_interval = v_primary_topic.current_interval,
        retention_score = v_primary_topic.retention_score,
        total_reviews = v_primary_topic.total_reviews,
        last_session_duration = v_primary_topic.last_session_duration,
        is_marked_for_review = v_primary_topic.is_marked_for_review,
        marked_for_review_at = v_primary_topic.marked_for_review_at,
        updated_at = now()
    where id = any(v_merged_topic_ids);
  end if;

  update public.topics
  set parent_topic_id = null,
      is_hidden = false,
      merged_with_ia = false,
      updated_at = now()
  where id = any(v_all_topic_ids);
  get diagnostics v_updated_topics = row_count;

  delete from public.topic_merges
  where id = p_merge_id
    and user_id = p_user_id;

  return jsonb_build_object(
    'ok', true,
    'reverted_topic_merge_id', p_merge_id,
    'updated_topics', v_updated_topics
  );
end;
$function$;

create or replace function public.revert_subject_merge(
  p_user_id uuid,
  p_merge_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_merge public.subject_merges%rowtype;
  v_topic_merge public.topic_merges%rowtype;
  v_primary_topic public.topics%rowtype;
  v_merged_subject_ids uuid[] := '{}';
  v_all_subject_ids uuid[] := '{}';
  v_merged_topic_ids uuid[] := '{}';
  v_all_topic_ids uuid[] := '{}';
  v_current_cycle text[] := '{}';
  v_new_cycle text[] := '{}';
  v_subjects_updated integer := 0;
  v_topics_updated integer := 0;
  v_topic_merges_deleted integer := 0;
  v_editais_updated integer := 0;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select *
    into v_merge
  from public.subject_merges
  where id = p_merge_id
    and user_id = p_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Subject merge not found for authenticated user' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(value::uuid), '{}'::uuid[])
    into v_merged_subject_ids
  from jsonb_array_elements_text(coalesce(v_merge.merged_subject_ids, '[]'::jsonb)) as value;

  v_all_subject_ids := array_prepend(v_merge.primary_subject_id, v_merged_subject_ids);

  if exists (
    select 1
    from public.subjects subject
    where subject.id = any(v_all_subject_ids)
      and subject.user_id is distinct from p_user_id
  ) then
    raise exception 'Subject merge contains subjects outside authenticated user scope' using errcode = '42501';
  end if;

  for v_topic_merge in
    select *
    from public.topic_merges
    where subject_merge_id = p_merge_id
      and user_id = p_user_id
      and status = 'active'
    for update
  loop
    select coalesce(array_agg(value::uuid), '{}'::uuid[])
      into v_merged_topic_ids
    from jsonb_array_elements_text(coalesce(v_topic_merge.merged_topic_ids, '[]'::jsonb)) as value;

    select *
      into v_primary_topic
    from public.topics
    where id = v_topic_merge.primary_topic_id
    for update;

    if found and array_length(v_merged_topic_ids, 1) > 0 then
      update public.topics
      set completed = v_primary_topic.completed,
          review_count = v_primary_topic.review_count,
          review_stage = v_primary_topic.review_stage,
          next_review = v_primary_topic.next_review,
          first_studied_at = v_primary_topic.first_studied_at,
          last_reviewed_at = v_primary_topic.last_reviewed_at,
          difficulty_level = v_primary_topic.difficulty_level,
          difficulty_set_at = v_primary_topic.difficulty_set_at,
          notes = v_primary_topic.notes,
          memory_stability = v_primary_topic.memory_stability,
          current_interval = v_primary_topic.current_interval,
          retention_score = v_primary_topic.retention_score,
          total_reviews = v_primary_topic.total_reviews,
          last_session_duration = v_primary_topic.last_session_duration,
          is_marked_for_review = v_primary_topic.is_marked_for_review,
          marked_for_review_at = v_primary_topic.marked_for_review_at,
          updated_at = now()
      where id = any(v_merged_topic_ids);
    end if;
  end loop;

  select coalesce(array_agg(topic.id), '{}'::uuid[])
    into v_all_topic_ids
  from public.topics topic
  join public.subjects subject on subject.id = topic.subject_id
  where subject.id = any(v_all_subject_ids)
    and subject.user_id = p_user_id;

  if array_length(v_all_topic_ids, 1) > 0 then
    update public.topics
    set parent_topic_id = null,
        is_hidden = false,
        merged_with_ia = false,
        updated_at = now()
    where id = any(v_all_topic_ids);
    get diagnostics v_topics_updated = row_count;
  end if;

  delete from public.topic_merges
  where subject_merge_id = p_merge_id
    and user_id = p_user_id;
  get diagnostics v_topic_merges_deleted = row_count;

  delete from public.subject_merges
  where id = p_merge_id
    and user_id = p_user_id;

  update public.subjects
  set is_unified = false,
      is_visible = true,
      updated_at = now()
  where id = any(v_all_subject_ids)
    and user_id = p_user_id;
  get diagnostics v_subjects_updated = row_count;

  select coalesce(ciclo_atual, '{}'::text[])
    into v_current_cycle
  from public.user_cycles
  where user_id = p_user_id
    and status = 'active'
  limit 1
  for update;

  if found then
    v_new_cycle := v_current_cycle || coalesce(array(
      select subject_id::text
      from unnest(v_all_subject_ids) as subject_id
      where not (subject_id::text = any(v_current_cycle))
    ), '{}'::text[]);

    update public.user_cycles
    set ciclo_atual = v_new_cycle,
        atualizado_em = now()
    where user_id = p_user_id
      and status = 'active';
  end if;

  update public.user_editais edital
  set active_subject_ids = coalesce(edital.active_subject_ids, '{}'::text[]) || coalesce(array(
        select subject_id::text
        from unnest(v_all_subject_ids) as subject_id
        where subject_id::text = any(coalesce(edital.subject_ids, '{}'::text[]))
          and not (subject_id::text = any(coalesce(edital.active_subject_ids, '{}'::text[])))
      ), '{}'::text[])
  where edital.user_id = p_user_id
    and coalesce(edital.subject_ids, '{}'::text[]) && (select array_agg(subject_id::text) from unnest(v_all_subject_ids) as subject_id);
  get diagnostics v_editais_updated = row_count;

  return jsonb_build_object(
    'ok', true,
    'reverted_subject_merge_id', p_merge_id,
    'updated_subjects', v_subjects_updated,
    'updated_topics', v_topics_updated,
    'deleted_topic_merges', v_topic_merges_deleted,
    'updated_editais', v_editais_updated
  );
end;
$function$;

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

revoke all on function public.revert_subject_merge(uuid, uuid) from public;
revoke all on function public.revert_subject_merge(uuid, uuid) from anon;
revoke all on function public.revert_subject_merge(uuid, uuid) from authenticated;
grant execute on function public.revert_subject_merge(uuid, uuid) to service_role;

revoke all on function public.revert_topic_merge(uuid, uuid) from public;
revoke all on function public.revert_topic_merge(uuid, uuid) from anon;
revoke all on function public.revert_topic_merge(uuid, uuid) from authenticated;
grant execute on function public.revert_topic_merge(uuid, uuid) to service_role;

revoke all on function public.user_rpc_dispatch(text, jsonb, uuid) from public;
revoke all on function public.user_rpc_dispatch(text, jsonb, uuid) from anon;
revoke all on function public.user_rpc_dispatch(text, jsonb, uuid) from authenticated;
grant execute on function public.user_rpc_dispatch(text, jsonb, uuid) to service_role;
