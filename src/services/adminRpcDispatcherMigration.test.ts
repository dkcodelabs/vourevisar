import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations_legacy/20260707124113_add_admin_rpc_dispatcher.sql',
);

const normalizeSql = (sql: string) => sql.replace(/\s+/g, ' ').trim().toLowerCase();
const readMigration = () => readFileSync(migrationPath, 'utf8');

describe('admin rpc dispatcher migration', () => {
  it('keeps the dispatcher private to service_role', () => {
    const sql = normalizeSql(readMigration());

    expect(sql).toContain('create or replace function public.admin_rpc_dispatch');
    expect(sql).toContain('revoke all on function public.admin_rpc_dispatch(text, jsonb, uuid) from authenticated');
    expect(sql).toContain('grant execute on function public.admin_rpc_dispatch(text, jsonb, uuid) to service_role');
    expect(sql).not.toMatch(/grant execute on function public\.admin_rpc_dispatch\(text, jsonb, uuid\) to authenticated/i);
  });

  it('sets the request jwt context before calling legacy admin functions', () => {
    const sql = normalizeSql(readMigration());

    expect(sql).toContain("set_config('request.jwt.claim.sub', p_actor_user_id::text, true)");
    expect(sql).toContain("set_config('request.jwt.claim.role', 'authenticated', true)");
    expect(sql).toContain("when 'admin_purge_user' then");
    expect(sql).toContain("when 'set_user_role' then");
  });
});
