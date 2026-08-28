create or replace function public.atomic_delete_subject(
  p_user_id uuid,
  p_subject_id uuid,
  p_edital_id_to_remove uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_subject_id uuid;
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

  select subject.id
  into v_subject_id
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

revoke all on function public.atomic_delete_subject(uuid, uuid, uuid) from public;
revoke all on function public.atomic_delete_subject(uuid, uuid, uuid) from anon;
grant execute on function public.atomic_delete_subject(uuid, uuid, uuid) to authenticated;
