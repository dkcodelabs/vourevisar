import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260912022908_fix_admin_purge_removed_incident_table.sql',
);

const sql = readFileSync(migrationPath, 'utf8').replace(/\s+/g, ' ').toLowerCase();

describe('admin purge user migration', () => {
  it('covers current user-owned modules before deleting auth.users', () => {
    const authDeleteIndex = sql.indexOf('delete from auth.users');

    expect(authDeleteIndex).toBeGreaterThan(-1);
    for (const table of [
      'billing_refund_requests',
      'billing_contract_acceptances',
      'billing_subscriptions',
      'billing_customers',
      'practice_attempts',
      'practice_session_items',
      'practice_packages',
      'topic_learning_signals',
      'legal_document_acceptances',
      'cycle_study_events',
      'edital_incidence_maps',
    ]) {
      expect(sql.indexOf(`delete from public.${table}`)).toBeLessThan(authDeleteIndex);
    }
  });

  it('keeps the purge callable only by the service role', () => {
    expect(sql).toContain('revoke all on function public.admin_purge_user(uuid) from public, authenticated');
    expect(sql).toContain('grant execute on function public.admin_purge_user(uuid) to service_role');
  });

  it('does not reference retired tables', () => {
    expect(sql).not.toContain('edital_incidence_maps');
    expect(sql).not.toContain('incident_action_log');
  });
});
