-- Prevent stale clients from bypassing the merge-aware atomic archive flow.
revoke all on function public.atomic_cycle_unload_or_delete(uuid, uuid) from public;
revoke all on function public.atomic_cycle_unload_or_delete(uuid, uuid) from anon;
revoke all on function public.atomic_cycle_unload_or_delete(uuid, uuid) from authenticated;
