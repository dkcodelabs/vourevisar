-- Tighten the authenticated RPC surface after auditing direct app calls and
-- RLS policy references. These functions are internal helpers, legacy endpoints,
-- or called only by other trusted database functions.
revoke all on function public.assign_user_role_admin(uuid, public.app_role) from authenticated;
revoke all on function public.get_all_topics_admin(integer, integer) from authenticated;
revoke all on function public.get_highest_user_role(uuid) from authenticated;
revoke all on function public.get_organization_role(uuid, uuid) from authenticated;
revoke all on function public.get_role_audit_log(integer) from authenticated;
revoke all on function public.get_user_info(uuid) from authenticated;
revoke all on function public.get_user_roles(uuid) from authenticated;
revoke all on function public.has_active_subscription(uuid) from authenticated;
revoke all on function public.is_organization_member(uuid, uuid) from authenticated;
revoke all on function public.log_custom_action(text, text, uuid, jsonb) from authenticated;
revoke all on function public.revert_subject_merge(uuid) from authenticated;
revoke all on function public.revert_topic_merge(uuid) from authenticated;
