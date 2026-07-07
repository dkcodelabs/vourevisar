create or replace function public.admin_rpc_dispatch(
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
    raise exception 'Admin RPC actor is required';
  end if;

  perform set_config('request.jwt.claim.sub', p_actor_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  case p_action
    when 'activate_paid_subscription' then
      select to_jsonb(public.activate_paid_subscription(
        (p_args->>'target_user_id')::uuid,
        p_args->>'plan_type'
      )) into v_result;

    when 'activate_trial_subscription' then
      select to_jsonb(public.activate_trial_subscription(
        (p_args->>'target_user_id')::uuid,
        coalesce((p_args->>'trial_days')::integer, 7)
      )) into v_result;

    when 'admin_deactivate_user' then
      select to_jsonb(public.admin_deactivate_user((p_args->>'target_user_id')::uuid)) into v_result;

    when 'admin_purge_user' then
      select to_jsonb(public.admin_purge_user((p_args->>'p_target_user_id')::uuid)) into v_result;

    when 'admin_reactivate_user' then
      select to_jsonb(public.admin_reactivate_user((p_args->>'target_user_id')::uuid)) into v_result;

    when 'calculate_slo_metrics' then
      select to_jsonb(public.calculate_slo_metrics((p_args->>'p_days_window')::integer)) into v_result;

    when 'check_error_alerts' then
      select to_jsonb(public.check_error_alerts()) into v_result;

    when 'cleanup_error_logs' then
      select to_jsonb(public.cleanup_error_logs((p_args->>'p_days_retention')::integer)) into v_result;

    when 'deactivate_subscription' then
      select to_jsonb(public.deactivate_subscription((p_args->>'target_user_id')::uuid)) into v_result;

    when 'get_all_user_roles_admin' then
      select coalesce(jsonb_agg(to_jsonb(row_data)), '[]'::jsonb)
      into v_result
      from public.get_all_user_roles_admin() as row_data;

    when 'get_audit_logs' then
      select coalesce(jsonb_agg(to_jsonb(row_data)), '[]'::jsonb)
      into v_result
      from public.get_audit_logs(
        coalesce((p_args->>'p_limit')::integer, 25),
        coalesce((p_args->>'p_offset')::integer, 0),
        nullif(p_args->>'p_event_type', ''),
        nullif(p_args->>'p_target_user_id', '')::uuid,
        nullif(p_args->>'p_actor_user_id', '')::uuid,
        nullif(p_args->>'p_status', ''),
        nullif(p_args->>'p_start_date', '')::timestamptz,
        nullif(p_args->>'p_end_date', '')::timestamptz
      ) as row_data;

    when 'get_users_by_edital_source' then
      select coalesce(jsonb_agg(to_jsonb(row_data)), '[]'::jsonb)
      into v_result
      from public.get_users_by_edital_source((p_args->>'source_uuid')::uuid) as row_data;

    when 'remove_user_role_admin' then
      select to_jsonb(public.remove_user_role_admin(
        (p_args->>'target_user_id')::uuid,
        (p_args->>'role_to_remove')::public.app_role
      )) into v_result;

    when 'set_user_role' then
      select to_jsonb(public.set_user_role(
        (p_args->>'_target_user_id')::uuid,
        (p_args->>'_role')::public.app_role
      )) into v_result;

    else
      raise exception 'Admin RPC action is not allowed: %', p_action;
  end case;

  return v_result;
end;
$$;

revoke all on function public.admin_rpc_dispatch(text, jsonb, uuid) from public;
revoke all on function public.admin_rpc_dispatch(text, jsonb, uuid) from anon;
revoke all on function public.admin_rpc_dispatch(text, jsonb, uuid) from authenticated;
grant execute on function public.admin_rpc_dispatch(text, jsonb, uuid) to service_role;
