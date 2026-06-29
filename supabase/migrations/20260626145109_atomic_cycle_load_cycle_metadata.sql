drop function if exists public.atomic_cycle_load(uuid, uuid, text[], uuid[], text);

create or replace function public.atomic_cycle_load(
  p_user_id uuid,
  p_new_edital_id uuid,
  p_new_subject_ids text[],
  p_old_edital_ids uuid[],
  p_mode text,
  p_cycle_name text default null,
  p_exam_date date default null
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

  if v_cycle_id is not null then
    update public.user_cycles
    set ciclo_atual = p_new_subject_ids,
        name = v_cycle_name,
        exam_date = p_exam_date,
        atualizado_em = v_now
    where id = v_cycle_id;
  else
    insert into public.user_cycles (
      user_id,
      ciclo_atual,
      name,
      exam_date,
      atualizado_em
    )
    values (
      p_user_id,
      p_new_subject_ids,
      v_cycle_name,
      p_exam_date,
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
    'resumed_reviews', v_resumed_reviews
  );
end;
$function$;

revoke all on function public.atomic_cycle_load(uuid, uuid, text[], uuid[], text, text, date) from public;
revoke all on function public.atomic_cycle_load(uuid, uuid, text[], uuid[], text, text, date) from anon;
grant execute on function public.atomic_cycle_load(uuid, uuid, text[], uuid[], text, text, date) to authenticated;
