import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations_legacy/20260707123500_tighten_unused_authenticated_security_definer_grants.sql',
);

const normalizeSql = (sql: string) => sql.replace(/\s+/g, ' ').trim().toLowerCase();
const readMigration = () => readFileSync(migrationPath, 'utf8');

describe('tighten unused authenticated security definer grants migration', () => {
  it('revokes authenticated execute from audited internal helpers', () => {
    const sql = normalizeSql(readMigration());

    expect(sql).toContain('revoke all on function public.get_highest_user_role(uuid) from authenticated');
    expect(sql).toContain('revoke all on function public.get_user_roles(uuid) from authenticated');
    expect(sql).toContain('revoke all on function public.has_active_subscription(uuid) from authenticated');
    expect(sql).toContain('revoke all on function public.revert_topic_merge(uuid) from authenticated');
  });

  it('does not revoke helpers currently referenced by RLS policies or direct user flows', () => {
    const sql = normalizeSql(readMigration());

    expect(sql).not.toContain('revoke all on function public.has_role(');
    expect(sql).not.toContain('revoke all on function public.has_role_or_higher(');
    expect(sql).not.toContain('revoke all on function public.is_admin() from authenticated');
    expect(sql).not.toContain('revoke all on function public.is_owner(uuid) from authenticated');
    expect(sql).not.toContain('revoke all on function public.is_user_active() from authenticated');
    expect(sql).not.toContain('revoke all on function public.atomic_cycle_load(');
    expect(sql).not.toContain('revoke all on function public.get_subscription_info(uuid) from authenticated');
  });
});
