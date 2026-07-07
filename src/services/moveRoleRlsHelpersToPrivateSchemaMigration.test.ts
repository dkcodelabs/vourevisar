import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20260707132120_move_role_rls_helpers_to_private_schema.sql',
);

describe('move role RLS helpers to private schema migration', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8').toLowerCase();

  it('creates private security definer helpers for RLS usage', () => {
    expect(sql).toContain('create schema if not exists private');
    expect(sql).toContain('create or replace function private.has_role(');
    expect(sql).toContain('create or replace function private.has_role_or_higher(');
    expect(sql).toContain('create or replace function private.is_admin()');
    expect(sql).toContain('create or replace function private.is_owner(');
    expect(sql).toContain('create or replace function private.is_user_active()');
    expect(sql).toContain('grant execute on function private.is_admin() to authenticated, service_role');
  });

  it('moves policies off public helpers before revoking the public RPC surface', () => {
    expect(sql).toContain('alter policy "user_subscriptions_select_policy" on public.user_subscriptions');
    expect(sql).toContain('or private.is_admin()');
    expect(sql).toContain('alter policy "topics_select_policy" on public.topics');
    expect(sql).toContain('and private.is_user_active()');
    expect(sql).toContain('revoke all on function public.has_role(uuid, public.app_role) from public, anon, authenticated');
    expect(sql).toContain('revoke all on function public.is_user_active() from public, anon, authenticated');
  });
});
