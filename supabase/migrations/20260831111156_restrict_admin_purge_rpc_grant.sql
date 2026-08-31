-- Destructive account purge is exposed only through the authenticated admin-rpc
-- Edge Function, which invokes the dispatcher with the service role. Keeping
-- the database RPC callable by every authenticated user is unnecessary.
revoke all on function public.admin_purge_user(uuid) from public, authenticated;
grant execute on function public.admin_purge_user(uuid) to service_role;
