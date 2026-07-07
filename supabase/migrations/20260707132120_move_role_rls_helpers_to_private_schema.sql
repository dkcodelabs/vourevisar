-- Keep role helpers available to RLS while removing their public REST/RPC surface.
create schema if not exists private;

grant usage on schema private to authenticated;
grant usage on schema private to service_role;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

create or replace function private.has_role(check_role public.app_role, check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = check_user_id
      and role = check_role
  );
$$;

create or replace function private.has_role_or_higher(_user_id uuid, _min_role public.app_role)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  user_roles_array public.app_role[];
begin
  select array_agg(role) into user_roles_array
  from public.user_roles
  where user_id = _user_id;

  if user_roles_array is null then
    return false;
  end if;

  case _min_role
    when 'user' then
      return user_roles_array && array['user', 'moderator', 'admin', 'owner']::public.app_role[];
    when 'moderator' then
      return user_roles_array && array['moderator', 'admin', 'owner']::public.app_role[];
    when 'admin' then
      return user_roles_array && array['admin', 'owner']::public.app_role[];
    when 'owner' then
      return user_roles_array && array['owner']::public.app_role[];
    else
      return false;
  end case;
end;
$$;

create or replace function private.has_role_or_higher(min_role public.app_role, check_user_id uuid default auth.uid())
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  user_roles_array public.app_role[];
begin
  select array_agg(role) into user_roles_array
  from public.user_roles
  where user_id = check_user_id;

  if user_roles_array is null then
    return false;
  end if;

  case min_role
    when 'user' then
      return user_roles_array && array['user', 'moderator', 'admin', 'owner']::public.app_role[];
    when 'moderator' then
      return user_roles_array && array['moderator', 'admin', 'owner']::public.app_role[];
    when 'admin' then
      return user_roles_array && array['admin', 'owner']::public.app_role[];
    when 'owner' then
      return user_roles_array && array['owner']::public.app_role[];
    else
      return false;
  end case;
end;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('admin'::public.app_role, 'owner'::public.app_role)
  );
$$;

create or replace function private.is_owner(_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = 'owner'::public.app_role
  );
$$;

create or replace function private.is_user_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
  );
$$;

revoke all on function private.has_role(uuid, public.app_role) from public;
revoke all on function private.has_role(public.app_role, uuid) from public;
revoke all on function private.has_role_or_higher(uuid, public.app_role) from public;
revoke all on function private.has_role_or_higher(public.app_role, uuid) from public;
revoke all on function private.is_admin() from public;
revoke all on function private.is_owner(uuid) from public;
revoke all on function private.is_user_active() from public;

grant execute on function private.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function private.has_role(public.app_role, uuid) to authenticated, service_role;
grant execute on function private.has_role_or_higher(uuid, public.app_role) to authenticated, service_role;
grant execute on function private.has_role_or_higher(public.app_role, uuid) to authenticated, service_role;
grant execute on function private.is_admin() to authenticated, service_role;
grant execute on function private.is_owner(uuid) to authenticated, service_role;
grant execute on function private.is_user_active() to authenticated, service_role;

alter policy "Admins can manage ai_error_logs" on public.ai_error_logs
  using (private.has_role_or_higher(auth.uid(), 'admin'::public.app_role))
  with check (private.has_role_or_higher(auth.uid(), 'admin'::public.app_role));

alter policy "Admins can view ai_error_logs" on public.ai_error_logs
  using (private.has_role_or_higher(auth.uid(), 'admin'::public.app_role));

alter policy "Admins can manage ai_status" on public.ai_status
  using (private.has_role_or_higher(auth.uid(), 'admin'::public.app_role))
  with check (private.has_role_or_higher(auth.uid(), 'admin'::public.app_role));

alter policy "Admins can view ai_status" on public.ai_status
  using (private.has_role_or_higher(auth.uid(), 'admin'::public.app_role));

alter policy "Admins can view audit logs" on public.audit_logs
  using (
    private.has_role(auth.uid(), 'owner'::public.app_role)
    or private.has_role(auth.uid(), 'admin'::public.app_role)
  );

alter policy "Moderators can manage comments" on public.comments
  using (private.has_role_or_higher(auth.uid(), 'moderator'::public.app_role));

alter policy "admin_all_suggestions" on public.edital_suggestions
  using (private.is_admin())
  with check (private.is_admin());

alter policy "System admins can manage all organizations" on public.organizations
  using (private.has_role_or_higher(auth.uid(), 'admin'::public.app_role));

alter policy "Active users can view own payment history" on public.payment_history
  using ((user_id = auth.uid()) and private.is_user_active());

alter policy "Admins can manage all posts" on public.posts
  using (private.has_role_or_higher(auth.uid(), 'admin'::public.app_role));

alter policy "Moderators can manage flagged posts" on public.posts
  using (
    private.has_role_or_higher(auth.uid(), 'moderator'::public.app_role)
    and status = 'flagged'::text
  );

alter policy "Admins can view all profiles" on public.profiles
  using (private.has_role_or_higher(auth.uid(), 'admin'::public.app_role));

alter policy "admin_all_public_editais" on public.public_editais
  using (private.is_admin())
  with check (private.is_admin());

alter policy "Owners can manage system settings" on public.system_settings
  using (private.is_owner(auth.uid()));

alter policy "topics_delete_policy" on public.topics
  using (
    exists (
      select 1
      from public.subjects s
      where s.id = topics.subject_id
        and s.user_id = (select auth.uid() as uid)
    )
    and private.is_user_active()
  );

alter policy "topics_insert_policy" on public.topics
  with check (
    exists (
      select 1
      from public.subjects s
      where s.id = topics.subject_id
        and s.user_id = (select auth.uid() as uid)
    )
    and private.is_user_active()
  );

alter policy "topics_select_policy" on public.topics
  using (
    exists (
      select 1
      from public.subjects s
      where s.id = topics.subject_id
        and s.user_id = (select auth.uid() as uid)
    )
    and private.is_user_active()
  );

alter policy "topics_update_policy" on public.topics
  using (
    exists (
      select 1
      from public.subjects s
      where s.id = topics.subject_id
        and s.user_id = (select auth.uid() as uid)
    )
    and private.is_user_active()
  );

alter policy "admin_insert_notifications" on public.user_notifications
  with check (private.is_admin());

alter policy "user_roles_select_policy" on public.user_roles
  using (
    user_id = (select auth.uid() as uid)
    or private.is_owner((select auth.uid() as uid))
  );

alter policy "user_subscriptions_select_policy" on public.user_subscriptions
  using (
    user_id = (select auth.uid() as uid)
    or private.is_admin()
  );

revoke all on function public.has_role(public.app_role, uuid) from public, anon, authenticated;
revoke all on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke all on function public.has_role_or_higher(public.app_role, uuid) from public, anon, authenticated;
revoke all on function public.has_role_or_higher(uuid, public.app_role) from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;
revoke all on function public.is_owner(uuid) from public, anon, authenticated;
revoke all on function public.is_user_active() from public, anon, authenticated;
