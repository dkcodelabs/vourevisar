import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260831185445_optimize_admin_rls_initplans.sql'),
  'utf8',
).replace(/\s+/g, ' ').toLowerCase();

describe('admin RLS policy initplan optimization', () => {
  it('preserves the existing role and ownership predicates while evaluating auth once', () => {
    expect(migration).toContain('alter policy "only owners and admins can view alerts" on public.admin_alert_events using (exists (select 1 from user_roles where user_roles.user_id = (select auth.uid())');
    expect(migration).toContain('alter policy "admins can manage ai_error_logs" on public.ai_error_logs using (private.has_role_or_higher((select auth.uid()), \'admin\'::app_role)) with check (private.has_role_or_higher((select auth.uid()), \'admin\'::app_role))');
    expect(migration).toContain('alter policy "users can insert their own profile" on public.profiles with check ((select auth.uid()) = id)');
    expect(migration).toContain('alter policy "authenticated users can subscribe to own topics" on realtime.messages using (((select auth.uid()) is not null)');
  });

  it('does not change policy commands, roles, grants, tables or functions', () => {
    expect(migration).toContain('alter policy "admins can manage coupon uses" on public.coupon_uses');
    expect(migration).toContain('alter policy "owner can manage plan configs" on public.plan_configs');
    expect(migration).toContain('alter policy "system admins can manage all organizations" on public.organizations');
    expect(migration).not.toMatch(/\b(grant |revoke |drop policy|alter table|create function|drop table)\b/);
  });
});
