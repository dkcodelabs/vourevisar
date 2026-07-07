-- SECURITY DEFINER functions bypass RLS. They must not inherit executable API
-- access from PUBLIC, and anonymous clients should not be able to call them.
do $$
declare
  fn record;
begin
  for fn in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format('revoke all on function %I.%I(%s) from public', fn.schema_name, fn.function_name, fn.args);
    execute format('revoke all on function %I.%I(%s) from anon', fn.schema_name, fn.function_name, fn.args);
    execute format('revoke all on function %I.%I(%s) from authenticated', fn.schema_name, fn.function_name, fn.args);
    execute format('grant execute on function %I.%I(%s) to service_role', fn.schema_name, fn.function_name, fn.args);
  end loop;
end $$;

-- Authenticated RPC surface still used by the app or by RLS helper policies.
grant execute on function public.activate_paid_subscription(uuid, text) to authenticated;
grant execute on function public.activate_trial_subscription(uuid, integer) to authenticated;
grant execute on function public.admin_deactivate_user(uuid) to authenticated;
grant execute on function public.admin_purge_user(uuid) to authenticated;
grant execute on function public.admin_reactivate_user(uuid) to authenticated;
grant execute on function public.assign_user_role_admin(uuid, public.app_role) to authenticated;
grant execute on function public.atomic_archive_edital_from_cycle(uuid, uuid) to authenticated;
grant execute on function public.atomic_cycle_load(uuid, uuid, text[], uuid[], text, text, date) to authenticated;
grant execute on function public.calculate_slo_metrics(integer) to authenticated;
grant execute on function public.check_error_alerts() to authenticated;
grant execute on function public.cleanup_error_logs(integer) to authenticated;
grant execute on function public.deactivate_subscription(uuid) to authenticated;
grant execute on function public.get_all_topics_admin(integer, integer) to authenticated;
grant execute on function public.get_all_user_roles_admin() to authenticated;
grant execute on function public.get_audit_logs(integer, integer, text, uuid, uuid, text, timestamp with time zone, timestamp with time zone) to authenticated;
grant execute on function public.get_highest_user_role(uuid) to authenticated;
grant execute on function public.get_organization_role(uuid, uuid) to authenticated;
grant execute on function public.get_role_audit_log(integer) to authenticated;
grant execute on function public.get_subscription_info(uuid) to authenticated;
grant execute on function public.get_unified_subject_name(uuid, uuid) to authenticated;
grant execute on function public.get_unified_topic_name(uuid, uuid) to authenticated;
grant execute on function public.get_user_ai_limits(uuid) to authenticated;
grant execute on function public.get_user_info(uuid) to authenticated;
grant execute on function public.get_user_roles(uuid) to authenticated;
grant execute on function public.get_users_by_edital_source(uuid) to authenticated;
grant execute on function public.has_active_subscription(uuid) to authenticated;
grant execute on function public.has_role(public.app_role, uuid) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.has_role_or_higher(public.app_role, uuid) to authenticated;
grant execute on function public.has_role_or_higher(uuid, public.app_role) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_organization_member(uuid, uuid) to authenticated;
grant execute on function public.is_owner(uuid) to authenticated;
grant execute on function public.is_user_active() to authenticated;
grant execute on function public.log_admin_error(text, text, text, text, text, text, text, boolean, uuid, jsonb, text, text, text, text, boolean, text, text, text, text, text, text, uuid, text, text, text, text) to authenticated;
grant execute on function public.log_custom_action(text, text, uuid, jsonb) to authenticated;
grant execute on function public.log_user_event(text, uuid, uuid, text, jsonb, text) to authenticated;
grant execute on function public.remove_user_role_admin(uuid, public.app_role) to authenticated;
grant execute on function public.revert_subject_merge(uuid) to authenticated;
grant execute on function public.revert_topic_merge(uuid) to authenticated;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.sync_topic_merge_progress(uuid, uuid, jsonb, jsonb) to authenticated;
grant execute on function public.use_coupon(text, uuid, text) to authenticated;
grant execute on function public.validate_coupon(text) to authenticated;
