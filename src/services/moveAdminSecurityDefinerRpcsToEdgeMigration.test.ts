import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260707123905_move_admin_security_definer_rpcs_to_edge.sql',
);

const normalizeSql = (sql: string) => sql.replace(/\s+/g, ' ').trim().toLowerCase();
const readMigration = () => readFileSync(migrationPath, 'utf8');

describe('move admin security definer rpcs to edge migration', () => {
  it('removes authenticated execute from admin rpc functions now behind admin-rpc', () => {
    const sql = normalizeSql(readMigration());

    expect(sql).toContain('revoke all on function public.admin_purge_user(uuid) from authenticated');
    expect(sql).toContain('revoke all on function public.set_user_role(uuid, public.app_role) from authenticated');
    expect(sql).toContain('revoke all on function public.get_audit_logs(integer, integer, text, uuid, uuid, text, timestamp with time zone, timestamp with time zone) from authenticated');
    expect(sql).toContain('revoke all on function public.activate_paid_subscription(uuid, text) from authenticated');
  });

  it('does not revoke user-facing or rls-helper functions in this cut', () => {
    const sql = normalizeSql(readMigration());

    expect(sql).not.toContain('revoke all on function public.get_subscription_info(uuid) from authenticated');
    expect(sql).not.toContain('revoke all on function public.validate_coupon(text) from authenticated');
    expect(sql).not.toContain('revoke all on function public.has_role(');
    expect(sql).not.toContain('revoke all on function public.is_user_active() from authenticated');
  });
});
