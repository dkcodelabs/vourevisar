import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260707121748_restrict_security_definer_rpc_execution.sql',
);

const normalizeSql = (sql: string) => sql.replace(/\s+/g, ' ').trim().toLowerCase();
const readMigration = () => readFileSync(migrationPath, 'utf8');

describe('restrict security definer rpc execution migration', () => {
  it('removes inherited and anonymous execute access from security definer functions', () => {
    const sql = normalizeSql(readMigration());

    expect(sql).toContain('and p.prosecdef');
    expect(sql).toContain('revoke all on function %i.%i(%s) from public');
    expect(sql).toContain('revoke all on function %i.%i(%s) from anon');
    expect(sql).toContain('revoke all on function %i.%i(%s) from authenticated');
    expect(sql).not.toMatch(/grant execute on function .* to anon/i);
  });

  it('keeps only the authenticated rpc surface used by the app explicit', () => {
    const sql = normalizeSql(readMigration());

    expect(sql).toContain('grant execute on function public.atomic_cycle_load(uuid, uuid, text[], uuid[], text, text, date) to authenticated');
    expect(sql).toContain('grant execute on function public.get_subscription_info(uuid) to authenticated');
    expect(sql).toContain('grant execute on function public.sync_topic_merge_progress(uuid, uuid, jsonb, jsonb) to authenticated');
    expect(sql).toContain('grant execute on function public.validate_coupon(text) to authenticated');
    expect(sql).not.toContain('grant execute on function public.check_email_exists(text) to authenticated');
  });
});
