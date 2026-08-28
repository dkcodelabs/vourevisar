-- Secure direct Data API access to study cycles.
-- The frontend reads and updates user_cycles in several active flows, so RLS
-- must allow authenticated users to manage only their own cycle rows.

alter table public.user_cycles enable row level security;

revoke all on table public.user_cycles from anon;
grant select, insert, update, delete on table public.user_cycles to authenticated;
grant select, insert, update, delete on table public.user_cycles to service_role;

drop policy if exists "user_cycles_select_own" on public.user_cycles;
drop policy if exists "user_cycles_insert_own" on public.user_cycles;
drop policy if exists "user_cycles_update_own" on public.user_cycles;
drop policy if exists "user_cycles_delete_own" on public.user_cycles;

create policy "user_cycles_select_own"
on public.user_cycles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "user_cycles_insert_own"
on public.user_cycles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "user_cycles_update_own"
on public.user_cycles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "user_cycles_delete_own"
on public.user_cycles
for delete
to authenticated
using ((select auth.uid()) = user_id);
