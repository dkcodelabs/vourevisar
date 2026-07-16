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
  v_current_studied_subjects text[] := '{}';
  v_new_cycle text[] := '{}';
  v_new_studied_subjects text[] := '{}';
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

  select coalesce(ciclo_atual, '{}'::text[]),
         coalesce(materias_estudadas_ciclo, '{}'::text[])
    into v_current_cycle, v_current_studied_subjects
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

    v_new_studied_subjects := coalesce(array(
      select studied_id
      from unnest(v_current_studied_subjects) as studied_id
      where studied_id <> all(coalesce(array(
        select subject_id::text
        from unnest(v_all_subject_ids) as subject_id
      ), '{}'::text[]))
    ), '{}'::text[]);

    update public.user_cycles
    set ciclo_atual = v_new_cycle,
        materias_estudadas_ciclo = v_new_studied_subjects,
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
    'updated_editais', v_editais_updated,
    'cleared_cycle_closure_subject_ids', to_jsonb(v_all_subject_ids)
  );
end;
$function$;

revoke all on function public.revert_subject_merge(uuid, uuid) from public;
revoke all on function public.revert_subject_merge(uuid, uuid) from anon;
revoke all on function public.revert_subject_merge(uuid, uuid) from authenticated;
grant execute on function public.revert_subject_merge(uuid, uuid) to service_role;
