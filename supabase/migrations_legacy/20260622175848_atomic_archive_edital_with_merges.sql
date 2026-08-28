create or replace function public.atomic_archive_edital_from_cycle(
  p_user_id uuid,
  p_edital_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_edital public.user_editais%rowtype;
  v_cycle public.user_cycles%rowtype;
  v_removed_subject_ids uuid[] := '{}';
  v_removed_topic_ids uuid[] := '{}';
  v_topic_merge record;
  v_subject_merge record;
  v_all_ids uuid[];
  v_survivor_ids uuid[];
  v_secondary_ids uuid[];
  v_remaining_edital_ids uuid[];
  v_new_primary uuid;
  v_cycle_subject text;
  v_new_cycle text[] := '{}';
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

  if v_cycle.id is not null then
    if v_active_count = 0 then
      delete from public.user_cycles where id = v_cycle.id;
    else
      update public.user_cycles
      set ciclo_atual = v_new_cycle,
          unification_map = v_unification_map,
          atualizado_em = now()
      where id = v_cycle.id;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'cycle_deleted', v_cycle.id is not null and v_active_count = 0,
    'remaining_editais', v_active_count,
    'subject_merges_updated', v_subject_merges_updated,
    'subject_merges_removed', v_subject_merges_removed,
    'topic_merges_updated', v_topic_merges_updated,
    'topic_merges_removed', v_topic_merges_removed
  );
end;
$function$;

revoke all on function public.atomic_archive_edital_from_cycle(uuid, uuid) from public;
revoke all on function public.atomic_archive_edital_from_cycle(uuid, uuid) from anon;
grant execute on function public.atomic_archive_edital_from_cycle(uuid, uuid) to authenticated;
;
