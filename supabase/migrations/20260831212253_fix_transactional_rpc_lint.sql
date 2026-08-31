-- Make PL/pgSQL array defaults explicit and remove variables used only for existence checks.
-- The transactional behavior, ownership checks, SECURITY DEFINER boundary and return contracts stay unchanged.

CREATE OR REPLACE FUNCTION public.atomic_delete_subject(p_user_id uuid, p_subject_id uuid, p_edital_id_to_remove uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_target_edital_id uuid;
  v_topic_ids uuid[] := '{}'::uuid[];
  v_surviving_subject_ids uuid[] := '{}'::uuid[];
  v_merge_survivors uuid[] := '{}'::uuid[];
  v_merge record;
  v_cycle record;
  v_group jsonb;
  v_unification_map jsonb;
  v_filtered_groups jsonb;
  v_standalone_ids jsonb;
  v_group_subject_ids jsonb;
  v_topics_deleted integer := 0;
  v_history_deleted integer := 0;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  perform 1
  from public.subjects subject
  where subject.id = p_subject_id
    and subject.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Subject not found for authenticated user' using errcode = 'P0002';
  end if;

  if p_edital_id_to_remove is not null then
    select edital.id
    into v_target_edital_id
    from public.user_editais edital
    where edital.id = p_edital_id_to_remove
      and edital.user_id = p_user_id
      and p_subject_id::text = any(coalesce(edital.subject_ids, '{}'::text[]))
    for update;

    if not found then
      raise exception 'Subject is not linked to the selected edital' using errcode = 'P0002';
    end if;

    update public.user_editais
    set subject_ids = array_remove(coalesce(subject_ids, '{}'::text[]), p_subject_id::text),
        active_subject_ids = array_remove(coalesce(active_subject_ids, '{}'::text[]), p_subject_id::text),
        updated_at = now()
    where id = v_target_edital_id
      and user_id = p_user_id;

    if exists (
      select 1
      from public.user_editais edital
      where edital.user_id = p_user_id
        and edital.id <> v_target_edital_id
        and p_subject_id::text = any(coalesce(edital.subject_ids, '{}'::text[]))
    ) then
      return jsonb_build_object(
        'ok', true,
        'subject_deleted', false,
        'edital_unlinked', v_target_edital_id
      );
    end if;
  else
    update public.user_editais
    set subject_ids = array_remove(coalesce(subject_ids, '{}'::text[]), p_subject_id::text),
        active_subject_ids = array_remove(coalesce(active_subject_ids, '{}'::text[]), p_subject_id::text),
        updated_at = now()
    where user_id = p_user_id
      and (
        p_subject_id::text = any(coalesce(subject_ids, '{}'::text[]))
        or p_subject_id::text = any(coalesce(active_subject_ids, '{}'::text[]))
      );
  end if;

  select coalesce(array_agg(topic.id), '{}'::uuid[])
  into v_topic_ids
  from public.topics topic
  where topic.subject_id = p_subject_id;

  v_topics_deleted := cardinality(v_topic_ids);

  select count(*)
  into v_history_deleted
  from public.topic_review_history history
  where history.user_id = p_user_id
    and history.topic_id = any(v_topic_ids);

  for v_merge in
    select merge.*
    from public.topic_merges merge
    where merge.user_id = p_user_id
      and (
        merge.primary_topic_id = any(v_topic_ids)
        or exists (
          select 1
          from unnest(v_topic_ids) topic_id
          where coalesce(merge.merged_topic_ids, '[]'::jsonb) ? topic_id::text
        )
      )
    for update
  loop
    if v_merge.status = 'active' then
      update public.topics topic
      set parent_topic_id = null,
          is_hidden = false,
          merged_with_ia = false
      where topic.id <> all(v_topic_ids)
        and (
          topic.id = v_merge.primary_topic_id
          or coalesce(v_merge.merged_topic_ids, '[]'::jsonb) ? topic.id::text
        );
    end if;

    delete from public.topic_merges where id = v_merge.id;
  end loop;

  for v_merge in
    select merge.*
    from public.subject_merges merge
    where merge.user_id = p_user_id
      and (
        merge.primary_subject_id = p_subject_id
        or coalesce(merge.merged_subject_ids, '[]'::jsonb) ? p_subject_id::text
      )
    for update
  loop
    select coalesce(array_agg(subject.id), '{}'::uuid[])
    into v_merge_survivors
    from public.subjects subject
    where subject.user_id = p_user_id
      and subject.id <> p_subject_id
      and (
        subject.id = v_merge.primary_subject_id
        or coalesce(v_merge.merged_subject_ids, '[]'::jsonb) ? subject.id::text
      );

    if v_merge.status = 'active' then
      update public.subjects subject
      set is_unified = false,
          is_visible = true
      where subject.id = any(v_merge_survivors)
        and subject.user_id = p_user_id;

      select coalesce(array_agg(distinct subject_id), '{}'::uuid[])
      into v_surviving_subject_ids
      from unnest(array_cat(v_surviving_subject_ids, v_merge_survivors)) subject_id;
    end if;

    delete from public.subject_merges where id = v_merge.id;
  end loop;

  delete from public.subject_relations relation
  where relation.user_id = p_user_id
    and (
      relation.main_subject_id = p_subject_id
      or p_subject_id = any(coalesce(relation.merged_subject_ids, '{}'::uuid[]))
    );

  for v_cycle in
    select cycle.*
    from public.user_cycles cycle
    where cycle.user_id = p_user_id
    for update
  loop
    v_unification_map := v_cycle.unification_map;

    if v_unification_map is not null then
      v_filtered_groups := '[]'::jsonb;
      v_standalone_ids := coalesce(v_unification_map -> 'standaloneSubjectIds', '[]'::jsonb);

      for v_group in
        select value
        from jsonb_array_elements(coalesce(v_unification_map -> 'unifiedSubjects', '[]'::jsonb))
      loop
        if coalesce(v_group -> 'originalSubjectIds', '[]'::jsonb) ? p_subject_id::text then
          select coalesce(jsonb_agg(to_jsonb(subject_id)), '[]'::jsonb)
          into v_group_subject_ids
          from jsonb_array_elements_text(coalesce(v_group -> 'originalSubjectIds', '[]'::jsonb)) subject_id
          where subject_id <> p_subject_id::text;

          v_standalone_ids := v_standalone_ids || v_group_subject_ids;
        else
          v_filtered_groups := v_filtered_groups || jsonb_build_array(v_group);
        end if;
      end loop;

      select coalesce(jsonb_agg(to_jsonb(subject_id)), '[]'::jsonb)
      into v_standalone_ids
      from (
        select distinct subject_id
        from jsonb_array_elements_text(v_standalone_ids) subject_id
        where subject_id <> p_subject_id::text
      ) distinct_subjects;

      v_unification_map := jsonb_set(v_unification_map, '{unifiedSubjects}', v_filtered_groups, true);
      v_unification_map := jsonb_set(v_unification_map, '{standaloneSubjectIds}', v_standalone_ids, true);
    end if;

    update public.user_cycles
    set ciclo_atual = (
          select coalesce(array_agg(subject_id order by first_position), '{}'::text[])
          from (
            select subject_id, min(position) as first_position
            from unnest(
              array_cat(
                array_remove(coalesce(v_cycle.ciclo_atual, '{}'::text[]), p_subject_id::text),
                coalesce(v_surviving_subject_ids, '{}'::uuid[])::text[]
              )
            ) with ordinality cycle_subject(subject_id, position)
            group by subject_id
          ) deduplicated
        ),
        disciplinas_do_dia = array_remove(coalesce(v_cycle.disciplinas_do_dia, '{}'::text[]), p_subject_id::text),
        materias_pendentes = array_remove(coalesce(v_cycle.materias_pendentes, '{}'::text[]), p_subject_id::text),
        materias_estudadas_ciclo = array_remove(coalesce(v_cycle.materias_estudadas_ciclo, '{}'::text[]), p_subject_id::text),
        materias_estudadas_hoje = array_remove(coalesce(v_cycle.materias_estudadas_hoje, '{}'::text[]), p_subject_id::text),
        skipped_subjects = array_remove(coalesce(v_cycle.skipped_subjects, '{}'::text[]), p_subject_id::text),
        unification_map = v_unification_map,
        atualizado_em = now()
    where id = v_cycle.id;
  end loop;

  delete from public.subjects subject
  where subject.id = p_subject_id
    and subject.user_id = p_user_id;

  if not found then
    raise exception 'Subject delete was rejected' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'ok', true,
    'subject_deleted', true,
    'topics_deleted', v_topics_deleted,
    'history_deleted', v_history_deleted
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.reset_edital_study_progress(p_user_id uuid, p_edital_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_subject_ids text[] := '{}'::text[];
  v_topic_ids text[] := '{}'::text[];
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

CREATE OR REPLACE FUNCTION public.atomic_cycle_load(p_user_id uuid, p_new_edital_id uuid, p_new_subject_ids text[], p_old_edital_ids uuid[], p_mode text, p_cycle_name text DEFAULT NULL::text, p_exam_date date DEFAULT NULL::date, p_reset_cycle_state boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_cycle_id uuid;
  v_old_id uuid;
  v_archived_at timestamptz;
  v_now timestamptz := now();
  v_resumed_reviews integer := 0;
  v_should_reset_cycle_state boolean := false;
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

  select id
    into v_cycle_id
  from public.user_cycles
  where user_id = p_user_id
  limit 1;

  v_should_reset_cycle_state := p_reset_cycle_state or p_mode = 'replace';

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

  if v_should_reset_cycle_state and v_cycle_id is not null then
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
        ciclos_realizados = case when v_should_reset_cycle_state then 0 else ciclos_realizados end,
        materias_estudadas_ciclo = case when v_should_reset_cycle_state then '{}'::text[] else materias_estudadas_ciclo end,
        indice_atual = case when v_should_reset_cycle_state then 0 else indice_atual end,
        data_inicio_ciclo = case when v_should_reset_cycle_state then v_now else data_inicio_ciclo end,
        data_fim_ciclo = case when v_should_reset_cycle_state then null else data_fim_ciclo end,
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

  update public.subjects
  set is_visible = true
  where user_id = p_user_id
    and id::text = any(p_new_subject_ids);

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
    'cycle_state_reset', v_should_reset_cycle_state
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.atomic_archive_edital_from_cycle(p_user_id uuid, p_edital_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_edital public.user_editais%rowtype;
  v_cycle public.user_cycles%rowtype;
  v_removed_subject_ids uuid[] := '{}'::uuid[];
  v_removed_topic_ids uuid[] := '{}'::uuid[];
  v_allowed_subject_ids uuid[] := '{}'::uuid[];
  v_missing_cycle text[] := '{}'::text[];
  v_topic_merge record;
  v_subject_merge record;
  v_all_ids uuid[];
  v_survivor_ids uuid[];
  v_secondary_ids uuid[];
  v_remaining_edital_ids uuid[];
  v_new_primary uuid;
  v_cycle_subject text;
  v_new_cycle text[] := '{}'::text[];
  v_remaining_cycle_name text;
  v_filtered_edital_ids jsonb := '[]'::jsonb;
  v_filtered_subject_groups jsonb := '[]'::jsonb;
  v_unification_map jsonb;
  v_group jsonb;
  v_group_subject_ids jsonb;
  v_active_count integer := 0;
  v_topic_merges_updated integer := 0;
  v_topic_merges_removed integer := 0;
  v_subject_merges_updated integer := 0;
  v_subject_merges_removed integer := 0;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select * into v_edital
  from public.user_editais
  where id = p_edital_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Edital not found for authenticated user' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(subject_id::uuid), '{}'::uuid[])
  into v_removed_subject_ids
  from unnest(coalesce(v_edital.subject_ids, '{}'::text[])) as subject_id
  where subject_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

  select coalesce(array_agg(id), '{}'::uuid[])
  into v_removed_topic_ids
  from public.topics
  where subject_id = any(v_removed_subject_ids);

  select * into v_cycle
  from public.user_cycles
  where user_id = p_user_id
    and coalesce(status, 'active') = 'active'
  order by created_at desc nulls last
  limit 1
  for update;

  for v_topic_merge in
    select *
    from public.topic_merges
    where user_id = p_user_id
      and status = 'active'
      and p_edital_id = any(coalesce(source_edital_ids, '{}'::uuid[]))
    for update
  loop
    select coalesce(array_agg(value::uuid), '{}'::uuid[])
    into v_secondary_ids
    from jsonb_array_elements_text(coalesce(v_topic_merge.merged_topic_ids, '[]'::jsonb)) as value;

    v_all_ids := array_cat(array[v_topic_merge.primary_topic_id], v_secondary_ids);
    v_remaining_edital_ids := array_remove(coalesce(v_topic_merge.source_edital_ids, '{}'::uuid[]), p_edital_id);

    select coalesce(array_agg(id), '{}'::uuid[])
    into v_survivor_ids
    from unnest(v_all_ids) as id
    where not (id = any(v_removed_topic_ids));

    update public.topics
    set parent_topic_id = null,
        is_hidden = false,
        merged_with_ia = false
    where id = any(v_removed_topic_ids)
      and id = any(v_all_ids);

    if cardinality(v_remaining_edital_ids) < 2 or cardinality(v_survivor_ids) < 2 then
      if cardinality(v_survivor_ids) = 1 then
        with best_topic_state as (
          select *
          from public.topics
          where id = any(v_all_ids)
          order by
            coalesce(completed, false) desc,
            coalesce(review_count, 0) desc,
            next_review asc nulls last,
            last_reviewed_at desc nulls last,
            first_studied_at desc nulls last,
            updated_at desc
          limit 1
        )
        update public.topics survivor
        set completed = coalesce(best.completed, survivor.completed),
            review_count = greatest(coalesce(survivor.review_count, 0), coalesce(best.review_count, 0)),
            review_stage = best.review_stage,
            next_review = best.next_review,
            first_studied_at = coalesce(survivor.first_studied_at, best.first_studied_at),
            last_reviewed_at = best.last_reviewed_at,
            memory_stability = coalesce(best.memory_stability, survivor.memory_stability),
            current_interval = coalesce(best.current_interval, survivor.current_interval),
            difficulty_level = coalesce(best.difficulty_level, survivor.difficulty_level),
            difficulty_set_at = coalesce(best.difficulty_set_at, survivor.difficulty_set_at),
            last_session_duration = coalesce(best.last_session_duration, survivor.last_session_duration),
            notes = coalesce(survivor.notes, best.notes),
            is_marked_for_review = coalesce(best.is_marked_for_review, survivor.is_marked_for_review),
            marked_for_review_at = coalesce(best.marked_for_review_at, survivor.marked_for_review_at),
            updated_at = now()
        from best_topic_state best
        where survivor.id = v_survivor_ids[1];
      end if;

      update public.topics
      set parent_topic_id = null,
          is_hidden = false,
          merged_with_ia = false
      where id = any(v_survivor_ids);

      delete from public.topic_merges where id = v_topic_merge.id;
      v_topic_merges_removed := v_topic_merges_removed + 1;
    else
      v_new_primary := case
        when v_topic_merge.primary_topic_id = any(v_survivor_ids) then v_topic_merge.primary_topic_id
        else v_survivor_ids[1]
      end;

      select coalesce(array_agg(id), '{}'::uuid[])
      into v_secondary_ids
      from unnest(v_survivor_ids) as id
      where id <> v_new_primary;

      update public.topic_merges
      set primary_topic_id = v_new_primary,
          merged_topic_ids = to_jsonb(v_secondary_ids),
          source_edital_ids = v_remaining_edital_ids
      where id = v_topic_merge.id;

      update public.topics
      set parent_topic_id = v_new_primary,
          is_hidden = true,
          merged_with_ia = coalesce(v_topic_merge.created_by_ai, false)
      where id = any(v_secondary_ids);

      update public.topics
      set parent_topic_id = null,
          is_hidden = false,
          merged_with_ia = coalesce(v_topic_merge.created_by_ai, false)
      where id = v_new_primary;

      v_topic_merges_updated := v_topic_merges_updated + 1;
    end if;
  end loop;

  for v_subject_merge in
    select *
    from public.subject_merges
    where user_id = p_user_id
      and status = 'active'
      and p_edital_id = any(coalesce(source_edital_ids, '{}'::uuid[]))
    for update
  loop
    select coalesce(array_agg(value::uuid), '{}'::uuid[])
    into v_secondary_ids
    from jsonb_array_elements_text(coalesce(v_subject_merge.merged_subject_ids, '[]'::jsonb)) as value;

    v_all_ids := array_cat(array[v_subject_merge.primary_subject_id], v_secondary_ids);
    v_remaining_edital_ids := array_remove(coalesce(v_subject_merge.source_edital_ids, '{}'::uuid[]), p_edital_id);

    select coalesce(array_agg(id), '{}'::uuid[])
    into v_survivor_ids
    from unnest(v_all_ids) as id
    where not (id = any(v_removed_subject_ids));

    update public.subjects
    set is_unified = false,
        is_visible = true
    where id = any(v_removed_subject_ids)
      and id = any(v_all_ids);

    if cardinality(v_remaining_edital_ids) < 2 or cardinality(v_survivor_ids) < 2 then
      if v_cycle.id is not null
        and cardinality(v_survivor_ids) = 1
        and v_subject_merge.primary_subject_id = any(v_removed_subject_ids)
      then
        v_cycle.ciclo_atual := array_replace(
          coalesce(v_cycle.ciclo_atual, '{}'::text[]),
          v_subject_merge.primary_subject_id::text,
          v_survivor_ids[1]::text
        );
      end if;

      update public.subjects
      set is_unified = false,
          is_visible = true
      where id = any(v_survivor_ids);

      delete from public.subject_merges where id = v_subject_merge.id;
      v_subject_merges_removed := v_subject_merges_removed + 1;
    else
      v_new_primary := case
        when v_subject_merge.primary_subject_id = any(v_survivor_ids) then v_subject_merge.primary_subject_id
        else v_survivor_ids[1]
      end;

      if v_cycle.id is not null and v_new_primary <> v_subject_merge.primary_subject_id then
        v_cycle.ciclo_atual := array_replace(
          coalesce(v_cycle.ciclo_atual, '{}'::text[]),
          v_subject_merge.primary_subject_id::text,
          v_new_primary::text
        );
      end if;

      select coalesce(array_agg(id), '{}'::uuid[])
      into v_secondary_ids
      from unnest(v_survivor_ids) as id
      where id <> v_new_primary;

      update public.subject_merges
      set primary_subject_id = v_new_primary,
          merged_subject_ids = to_jsonb(v_secondary_ids),
          source_edital_ids = v_remaining_edital_ids
      where id = v_subject_merge.id;

      update public.subjects
      set is_unified = true,
          is_visible = false
      where id = any(v_secondary_ids);

      update public.subjects
      set is_unified = false,
          is_visible = true
      where id = v_new_primary;

      v_subject_merges_updated := v_subject_merges_updated + 1;
    end if;
  end loop;

  update public.topics
  set parent_topic_id = null,
      is_hidden = false,
      merged_with_ia = false
  where parent_topic_id = any(v_removed_topic_ids);

  if v_cycle.id is not null then
    foreach v_cycle_subject in array coalesce(v_cycle.ciclo_atual, '{}'::text[])
    loop
      if v_cycle_subject !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or not (v_cycle_subject::uuid = any(v_removed_subject_ids)) then
        v_new_cycle := array_append(v_new_cycle, v_cycle_subject);
      end if;
    end loop;

    select coalesce(array_agg(subject_id order by first_position), '{}'::text[])
    into v_new_cycle
    from (
      select subject_id, min(position) as first_position
      from unnest(v_new_cycle) with ordinality as cycle_subject(subject_id, position)
      group by subject_id
    ) deduplicated;

    v_unification_map := v_cycle.unification_map;
    if v_unification_map is not null then
      select coalesce(jsonb_agg(to_jsonb(edital_id)), '[]'::jsonb)
      into v_filtered_edital_ids
      from jsonb_array_elements_text(coalesce(v_unification_map -> 'editalIds', '[]'::jsonb)) as edital_id
      where edital_id::uuid <> p_edital_id;

      v_filtered_subject_groups := '[]'::jsonb;
      for v_group in
        select value
        from jsonb_array_elements(coalesce(v_unification_map -> 'unifiedSubjects', '[]'::jsonb))
      loop
        select coalesce(jsonb_agg(to_jsonb(subject_id)), '[]'::jsonb)
        into v_group_subject_ids
        from jsonb_array_elements_text(coalesce(v_group -> 'originalSubjectIds', '[]'::jsonb)) as subject_id
        where not (subject_id::uuid = any(v_removed_subject_ids));

        if jsonb_array_length(v_group_subject_ids) > 1 then
          v_filtered_subject_groups := v_filtered_subject_groups || jsonb_build_array(
            jsonb_set(v_group, '{originalSubjectIds}', v_group_subject_ids, true)
          );
        end if;
      end loop;

      if jsonb_array_length(v_filtered_edital_ids) < 2 then
        v_unification_map := null;
      else
        v_unification_map := jsonb_set(v_unification_map, '{editalIds}', v_filtered_edital_ids, true);
        v_unification_map := jsonb_set(v_unification_map, '{unifiedSubjects}', v_filtered_subject_groups, true);
      end if;
    end if;
  end if;

  update public.user_editais
  set merged_into_cycle = false,
      active_subject_ids = '{}',
      cycle_archived_at = coalesce(cycle_archived_at, now())
  where id = p_edital_id
    and user_id = p_user_id;

  select count(*) into v_active_count
  from public.user_editais
  where user_id = p_user_id
    and merged_into_cycle = true;

  update public.user_editais remaining_edital
  set active_subject_ids = rebuilt.active_subject_ids,
      updated_at = now()
  from (
    select
      active_edital.id,
      coalesce(
        array_agg(mapped.active_subject_id::text order by mapped.first_position)
          filter (where mapped.active_subject_id is not null),
        '{}'::text[]
      ) as active_subject_ids
    from public.user_editais active_edital
    left join lateral (
      select
        coalesce(active_merge.primary_subject_id, own_subject.subject_id) as active_subject_id,
        min(own_subject.subject_position) as first_position
      from (
        select
          subject_value::uuid as subject_id,
          subject_position
        from unnest(coalesce(active_edital.subject_ids, '{}'::text[]))
          with ordinality as active_subject(subject_value, subject_position)
        where subject_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      ) own_subject
      left join public.subject_merges active_merge
        on active_merge.user_id = p_user_id
       and active_merge.status = 'active'
       and (
         active_merge.primary_subject_id = own_subject.subject_id
         or exists (
           select 1
           from jsonb_array_elements_text(coalesce(active_merge.merged_subject_ids, '[]'::jsonb)) as merged_subject(subject_id)
           where merged_subject.subject_id::uuid = own_subject.subject_id
         )
       )
      group by coalesce(active_merge.primary_subject_id, own_subject.subject_id)
    ) mapped on true
    where active_edital.user_id = p_user_id
      and active_edital.merged_into_cycle = true
    group by active_edital.id
  ) rebuilt
  where remaining_edital.id = rebuilt.id
    and remaining_edital.user_id = p_user_id
    and remaining_edital.merged_into_cycle = true;

  select coalesce(array_agg(active_subject_id), '{}'::uuid[])
  into v_allowed_subject_ids
  from (
    select distinct active_subject_value::uuid as active_subject_id
    from public.user_editais active_edital
    cross join lateral unnest(coalesce(active_edital.active_subject_ids, '{}'::text[]))
      as active_subject(active_subject_value)
    where active_edital.user_id = p_user_id
      and active_edital.merged_into_cycle = true
      and active_subject_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) allowed_subjects;

  if v_cycle.id is not null then
    if v_active_count = 0 then
      update public.user_cycles
      set ciclo_atual = '{}'::text[],
          materias_estudadas_ciclo = coalesce(materias_estudadas_ciclo, '{}'::text[]),
          materias_pendentes = '{}'::text[],
          materias_estudadas_hoje = '{}'::text[],
          disciplinas_do_dia = '{}'::text[],
          skipped_subjects = '{}'::text[],
          unification_map = null,
          atualizado_em = now()
      where id = v_cycle.id;
    else
      v_new_cycle := '{}'::text[];

      foreach v_cycle_subject in array coalesce(v_cycle.ciclo_atual, '{}'::text[])
      loop
        if v_cycle_subject !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          or not (v_cycle_subject::uuid = any(v_allowed_subject_ids)) then
          continue;
        end if;

        v_new_cycle := array_append(v_new_cycle, v_cycle_subject);
      end loop;

      select coalesce(array_agg(subject_id order by first_position), '{}'::text[])
      into v_new_cycle
      from (
        select subject_id, min(position) as first_position
        from unnest(v_new_cycle) with ordinality as cycle_subject(subject_id, position)
        group by subject_id
      ) deduplicated;

      select coalesce(array_agg(subject_id::text order by first_position), '{}'::text[])
      into v_missing_cycle
      from (
        select
          active_subject_value::uuid as subject_id,
          min(edital_position * 100000 + subject_position) as first_position
        from public.user_editais active_edital
        cross join lateral unnest(coalesce(active_edital.active_subject_ids, '{}'::text[]))
          with ordinality as active_subject(active_subject_value, subject_position)
        cross join lateral (
          select coalesce((
            select min(edital_position)
            from (
              select id, row_number() over (order by created_at nulls last, id) as edital_position
              from public.user_editais
              where user_id = p_user_id
                and merged_into_cycle = true
            ) ordered_editais
            where ordered_editais.id = active_edital.id
          ), 0)::bigint as edital_position
        ) ordered_edital
        where active_edital.user_id = p_user_id
          and active_edital.merged_into_cycle = true
          and active_subject_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          and not (active_subject_value = any(v_new_cycle))
        group by active_subject_value::uuid
      ) missing_subjects;

      v_new_cycle := array_cat(v_new_cycle, v_missing_cycle);

      select coalesce(
        nullif(
          substring(
            string_agg(
              upper(regexp_replace(trim(name), '\s+', ' ', 'g')),
              ' + '
              order by created_at asc nulls last, id
            ),
            1,
            160
          ),
          ''
        ),
        'Ciclo de estudos'
      )
      into v_remaining_cycle_name
      from (
        select distinct on (upper(regexp_replace(trim(name), '\s+', ' ', 'g')))
          name, created_at, id
        from public.user_editais
        where user_id = p_user_id
          and merged_into_cycle = true
        order by upper(regexp_replace(trim(name), '\s+', ' ', 'g')), created_at asc nulls last, id
      ) distinct_editais;

      update public.user_cycles
      set name = coalesce(v_remaining_cycle_name, name),
          ciclo_atual = v_new_cycle,
          unification_map = v_unification_map,
          atualizado_em = now()
      where id = v_cycle.id;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'cycle_deleted', v_cycle.id is not null and v_active_count = 0,
    'cycle_preserved_for_reload', v_cycle.id is not null and v_active_count = 0,
    'remaining_editais', v_active_count,
    'subject_merges_updated', v_subject_merges_updated,
    'subject_merges_removed', v_subject_merges_removed,
    'topic_merges_updated', v_topic_merges_updated,
    'topic_merges_removed', v_topic_merges_removed
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.revert_subject_merge(p_user_id uuid, p_merge_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_merge public.subject_merges%rowtype;
  v_topic_merge public.topic_merges%rowtype;
  v_primary_topic public.topics%rowtype;
  v_merged_subject_ids uuid[] := '{}'::uuid[];
  v_all_subject_ids uuid[] := '{}'::uuid[];
  v_merged_topic_ids uuid[] := '{}'::uuid[];
  v_all_topic_ids uuid[] := '{}'::uuid[];
  v_current_cycle text[] := '{}'::text[];
  v_current_studied_subjects text[] := '{}'::text[];
  v_new_cycle text[] := '{}'::text[];
  v_new_studied_subjects text[] := '{}'::text[];
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

CREATE OR REPLACE FUNCTION public.revert_topic_merge(p_user_id uuid, p_merge_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_merge public.topic_merges%rowtype;
  v_primary_topic public.topics%rowtype;
  v_merged_topic_ids uuid[] := '{}'::uuid[];
  v_all_topic_ids uuid[] := '{}'::uuid[];
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

CREATE OR REPLACE FUNCTION public.sync_topic_merge_progress(p_user_id uuid, p_topic_id uuid, p_progress jsonb, p_history jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_topic_merge public.topic_merges%rowtype;
  v_secondary_ids uuid[] := '{}'::uuid[];
  v_candidate_ids uuid[] := '{}'::uuid[];
  v_target_ids uuid[] := '{}'::uuid[];
  v_has_merge boolean := false;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_progress is null or jsonb_typeof(p_progress) <> 'object' then
    raise exception 'Progress payload must be a JSON object' using errcode = '22023';
  end if;

  if p_history is not null and jsonb_typeof(p_history) <> 'object' then
    raise exception 'History payload must be a JSON object' using errcode = '22023';
  end if;

  perform 1
  from public.topics t
  join public.subjects s on s.id = t.subject_id
  where t.id = p_topic_id
    and s.user_id = p_user_id
  for update of t;

  if not found then
    raise exception 'Topic not found for authenticated user' using errcode = 'P0002';
  end if;

  select * into v_topic_merge
  from public.topic_merges
  where user_id = p_user_id
    and status = 'active'
    and (
      primary_topic_id = p_topic_id
      or coalesce(merged_topic_ids, '[]'::jsonb) ? p_topic_id::text
    )
  order by created_at desc
  limit 1
  for update;

  if found then
    v_has_merge := true;

    select coalesce(array_agg(value::uuid), '{}'::uuid[])
    into v_secondary_ids
    from jsonb_array_elements_text(coalesce(v_topic_merge.merged_topic_ids, '[]'::jsonb)) as value;

    v_candidate_ids := array_cat(array[v_topic_merge.primary_topic_id], v_secondary_ids);

    select coalesce(array_agg(distinct t.id), '{}'::uuid[])
    into v_target_ids
    from unnest(v_candidate_ids) as candidate(id)
    join public.topics t on t.id = candidate.id
    join public.subjects s on s.id = t.subject_id
    where s.user_id = p_user_id;
  else
    v_target_ids := array[p_topic_id];
  end if;

  update public.topics
  set completed = case
        when p_progress ? 'completed' then (p_progress ->> 'completed')::boolean
        else completed
      end,
      review_count = case
        when p_progress ? 'review_count' then (p_progress ->> 'review_count')::integer
        else review_count
      end,
      review_stage = case
        when p_progress ? 'review_stage' then p_progress ->> 'review_stage'
        else review_stage
      end,
      next_review = case
        when p_progress ? 'next_review' then nullif(p_progress ->> 'next_review', '')::timestamptz
        else next_review
      end,
      first_studied_at = case
        when p_progress ? 'first_studied_at' then nullif(p_progress ->> 'first_studied_at', '')::timestamptz
        else first_studied_at
      end,
      last_reviewed_at = case
        when p_progress ? 'last_reviewed_at' then nullif(p_progress ->> 'last_reviewed_at', '')::timestamptz
        else last_reviewed_at
      end,
      memory_stability = case
        when p_progress ? 'memory_stability' then (p_progress ->> 'memory_stability')::real
        else memory_stability
      end,
      current_interval = case
        when p_progress ? 'current_interval' then (p_progress ->> 'current_interval')::real
        else current_interval
      end,
      difficulty_level = case
        when p_progress ? 'difficulty_level' then (p_progress ->> 'difficulty_level')::integer
        else difficulty_level
      end,
      difficulty_set_at = case
        when p_progress ? 'difficulty_set_at' then nullif(p_progress ->> 'difficulty_set_at', '')::timestamptz
        else difficulty_set_at
      end,
      last_session_duration = case
        when p_progress ? 'last_session_duration' then (p_progress ->> 'last_session_duration')::integer
        else last_session_duration
      end,
      is_marked_for_review = case
        when p_progress ? 'is_marked_for_review' then (p_progress ->> 'is_marked_for_review')::boolean
        else is_marked_for_review
      end,
      marked_for_review_at = case
        when p_progress ? 'marked_for_review_at' then nullif(p_progress ->> 'marked_for_review_at', '')::timestamptz
        else marked_for_review_at
      end,
      total_reviews = case
        when p_progress ? 'total_reviews' then (p_progress ->> 'total_reviews')::integer
        else total_reviews
      end,
      retention_score = case
        when p_progress ? 'retention_score' then (p_progress ->> 'retention_score')::real
        else retention_score
      end,
      notes = case
        when p_progress ? 'notes' then p_progress -> 'notes'
        else notes
      end,
      updated_at = now()
  where id = any(v_target_ids);

  if p_history is not null then
    insert into public.topic_review_history (
      user_id,
      topic_id,
      edital_id,
      cycle_id,
      review_stage,
      reviewed_at,
      study_duration_minutes,
      difficulty_numeric,
      memory_stability_after_review,
      interval_after_review,
      trend_delta,
      trend_label
    )
    select
      p_user_id,
      target_id,
      nullif(p_history ->> 'edital_id', '')::uuid,
      nullif(p_history ->> 'cycle_id', '')::uuid,
      coalesce(nullif(p_history ->> 'review_stage', ''), coalesce(p_progress ->> 'review_stage', 'Revisão')),
      coalesce(nullif(p_history ->> 'reviewed_at', '')::timestamptz, now()),
      nullif(p_history ->> 'study_duration_minutes', '')::integer,
      nullif(p_history ->> 'difficulty_numeric', '')::integer,
      nullif(p_history ->> 'memory_stability_after_review', '')::real,
      nullif(p_history ->> 'interval_after_review', '')::real,
      nullif(p_history ->> 'trend_delta', '')::real,
      nullif(p_history ->> 'trend_label', '')
    from unnest(v_target_ids) as target(target_id);
  end if;

  return jsonb_build_object(
    'ok', true,
    'synced_topic_ids', to_jsonb(v_target_ids),
    'merged', v_has_merge
  );
end;
$function$;
