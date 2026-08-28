-- Admin/system RPCs now go through the admin-rpc Edge Function, which validates
-- the caller role and invokes these functions with service_role. Authenticated
-- browser clients must not execute these SECURITY DEFINER functions directly.
revoke all on function public.activate_paid_subscription(uuid, text) from authenticated;
revoke all on function public.activate_trial_subscription(uuid, integer) from authenticated;
revoke all on function public.admin_deactivate_user(uuid) from authenticated;
revoke all on function public.admin_purge_user(uuid) from authenticated;
revoke all on function public.admin_reactivate_user(uuid) from authenticated;
revoke all on function public.calculate_slo_metrics(integer) from authenticated;
revoke all on function public.check_error_alerts() from authenticated;
revoke all on function public.cleanup_error_logs(integer) from authenticated;
revoke all on function public.deactivate_subscription(uuid) from authenticated;
revoke all on function public.get_all_user_roles_admin() from authenticated;
revoke all on function public.get_audit_logs(integer, integer, text, uuid, uuid, text, timestamp with time zone, timestamp with time zone) from authenticated;
revoke all on function public.get_users_by_edital_source(uuid) from authenticated;
revoke all on function public.remove_user_role_admin(uuid, public.app_role) from authenticated;
revoke all on function public.set_user_role(uuid, public.app_role) from authenticated;
