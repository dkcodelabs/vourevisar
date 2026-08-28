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
      on active_merge.user_id = active_edital.user_id
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
  where active_edital.merged_into_cycle = true
  group by active_edital.id
) rebuilt
where remaining_edital.id = rebuilt.id
  and remaining_edital.merged_into_cycle = true;

update public.user_cycles cycle
set ciclo_atual = rebuilt_cycle.ciclo_atual,
    unification_map = case
      when not exists (
        select 1
        from public.subject_merges active_merge
        where active_merge.user_id = cycle.user_id
          and active_merge.status = 'active'
      ) then null
      else cycle.unification_map
    end,
    atualizado_em = now()
from (
  select
    ordered_subjects.cycle_id,
    coalesce(array_agg(ordered_subjects.subject_id::text order by ordered_subjects.first_position), '{}'::text[]) as ciclo_atual
  from (
    select
      active_cycle.id as cycle_id,
      active_subject_value::uuid as subject_id,
      min(coalesce(existing_cycle_position.position, edital_order.edital_position * 100000 + active_subject.subject_position)) as first_position
    from public.user_cycles active_cycle
    join public.user_editais active_edital
      on active_edital.user_id = active_cycle.user_id
     and active_edital.merged_into_cycle = true
    cross join lateral unnest(coalesce(active_edital.active_subject_ids, '{}'::text[]))
      with ordinality as active_subject(active_subject_value, subject_position)
    cross join lateral (
      select row_number() over (order by ordered_edital.created_at nulls last, ordered_edital.id)::bigint as edital_position
      from public.user_editais ordered_edital
      where ordered_edital.user_id = active_cycle.user_id
        and ordered_edital.merged_into_cycle = true
        and ordered_edital.id <= active_edital.id
      order by ordered_edital.created_at nulls last, ordered_edital.id
      limit 1
    ) edital_order
    left join lateral (
      select cycle_subject.position::bigint
      from unnest(coalesce(active_cycle.ciclo_atual, '{}'::text[]))
        with ordinality as cycle_subject(subject_value, position)
      where cycle_subject.subject_value = active_subject_value
      limit 1
    ) existing_cycle_position on true
    where coalesce(active_cycle.status, 'active') = 'active'
      and active_subject_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    group by active_cycle.id, active_subject_value::uuid
  ) ordered_subjects
  group by ordered_subjects.cycle_id
) rebuilt_cycle
where cycle.id = rebuilt_cycle.cycle_id
  and coalesce(cycle.status, 'active') = 'active';
