create or replace function public.atomic_cycle_unload_or_delete(
  p_user_id uuid,
  p_edital_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_cycle_id uuid;
  v_active_count integer;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  update public.user_editais
  set merged_into_cycle = false,
      active_subject_ids = '{}'
  where id = p_edital_id
    and user_id = p_user_id;

  select id into v_cycle_id
  from public.user_cycles
  where user_id = p_user_id
  limit 1;

  if v_cycle_id is null then
    return jsonb_build_object(
      'ok', true,
      'action', 'no_cycle',
      'cycle_deleted', false
    );
  end if;

  select count(*) into v_active_count
  from public.user_editais
  where user_id = p_user_id
    and merged_into_cycle = true;

  if v_active_count = 0 then
    delete from public.user_cycles where id = v_cycle_id;

    return jsonb_build_object(
      'ok', true,
      'action', 'cycle_deleted',
      'cycle_deleted', true,
      'cycle_id', v_cycle_id
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'action', 'edital_unloaded',
    'cycle_deleted', false,
    'remaining_editais', v_active_count
  );
end;
$function$;

revoke all on function public.atomic_cycle_unload_or_delete(uuid, uuid) from public;
revoke all on function public.atomic_cycle_unload_or_delete(uuid, uuid) from anon;
grant execute on function public.atomic_cycle_unload_or_delete(uuid, uuid) to authenticated;
