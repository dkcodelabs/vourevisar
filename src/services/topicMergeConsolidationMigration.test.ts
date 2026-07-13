import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260711123000_consolidate_existing_topic_merge_progress.sql',
);

const normalizeSql = (sql: string) => sql.replace(/\s+/g, ' ').trim().toLowerCase();

describe('topic merge consolidation migration', () => {
  const sql = normalizeSql(readFileSync(migrationPath, 'utf8'));

  it('repairs active topic merge groups using one consolidated progress state', () => {
    expect(sql).toContain('from public.topic_merges');
    expect(sql).toContain("where status = 'active'");
    expect(sql).toContain('bool_or(coalesce(t.completed, false)) as completed');
    expect(sql).toContain('max(coalesce(t.review_count, 0)) as review_count');
    expect(sql).toContain('min(t.first_studied_at)');
    expect(sql).toContain('max(t.last_reviewed_at)');
    expect(sql).toContain('update public.topics target');
  });

  it('does not duplicate study session time while repairing progress fields', () => {
    expect(sql).not.toContain('insert into public.study_sessions');
    expect(sql).not.toContain('update public.study_sessions');
  });
});
