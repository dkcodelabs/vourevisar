import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations_legacy/20260626194107_sync_topic_merge_progress_rpc.sql',
);

const readMigration = () => readFileSync(migrationPath, 'utf8');

describe('sync_topic_merge_progress migration', () => {
  it('creates an authenticated atomic RPC that updates the clicked topic and merged siblings', () => {
    const sql = readMigration();

    expect(sql).toContain('create or replace function public.sync_topic_merge_progress');
    expect(sql).toMatch(/\(select auth\.uid\(\)\) is distinct from p_user_id/i);
    expect(sql).toMatch(/for update/i);
    expect(sql).toMatch(/primary_topic_id\s*=\s*p_topic_id/i);
    expect(sql).toMatch(/merged_topic_ids/i);
    expect(sql).toMatch(/where id = any\(v_target_ids\)/i);
    expect(sql).toMatch(/grant execute on function public\.sync_topic_merge_progress\(uuid, uuid, jsonb, jsonb\) to authenticated/i);
    expect(sql).toMatch(/insert into public\.topic_review_history/i);
    expect(sql).toMatch(/select\s+p_user_id,\s+target_id/i);
  });

  it('uses an explicit progress whitelist and does not copy editorial fields', () => {
    const sql = readMigration();

    expect(sql).toMatch(/review_count\s*=/i);
    expect(sql).toMatch(/review_stage\s*=/i);
    expect(sql).toMatch(/next_review\s*=/i);
    expect(sql).toMatch(/memory_stability\s*=/i);
    expect(sql).not.toMatch(/\bname\s*=/i);
    expect(sql).not.toMatch(/\bposition\s*=/i);
    expect(sql).not.toMatch(/\bsubject_id\s*=/i);
    expect(sql).not.toMatch(/\bedital_id\s*=/i);
  });

  it('uses an explicit history whitelist instead of inserting arbitrary JSON', () => {
    const sql = readMigration();

    expect(sql).toMatch(/p_history jsonb default null/i);
    expect(sql).toMatch(/review_stage,\s*reviewed_at,\s*study_duration_minutes/i);
    expect(sql).toMatch(/difficulty_numeric,\s*memory_stability_after_review,\s*interval_after_review/i);
    expect(sql).not.toMatch(/jsonb_populate_record/i);
  });
});
