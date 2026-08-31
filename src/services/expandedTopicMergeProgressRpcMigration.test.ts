import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations_legacy/20260711124000_expand_sync_topic_merge_progress_fields.sql',
);

const normalizeSql = (sql: string) => sql.replace(/\s+/g, ' ').trim().toLowerCase();

describe('expanded sync_topic_merge_progress migration', () => {
  const sql = normalizeSql(readFileSync(migrationPath, 'utf8'));

  it('syncs all active progress fields used by merged topics', () => {
    expect(sql).toContain("when p_progress ? 'difficulty_level'");
    expect(sql).toContain("when p_progress ? 'difficulty_set_at'");
    expect(sql).toContain("when p_progress ? 'total_reviews'");
    expect(sql).toContain("when p_progress ? 'retention_score'");
    expect(sql).toContain("when p_progress ? 'notes'");
    expect(sql).toContain("when p_progress ? 'last_session_duration'");
  });

  it('keeps the RPC behind the service-role dispatcher boundary', () => {
    expect(sql).toContain('revoke all on function public.sync_topic_merge_progress(uuid, uuid, jsonb, jsonb) from authenticated');
    expect(sql).toContain('grant execute on function public.sync_topic_merge_progress(uuid, uuid, jsonb, jsonb) to service_role');
  });
});
