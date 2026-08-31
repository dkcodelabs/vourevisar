import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations_legacy/20260716143000_transactional_merge_revert.sql'),
  'utf8',
);

describe('transactional merge revert migration', () => {
  it('creates user-scoped transactional RPCs for subject and topic reverts', () => {
    expect(sql).toContain('create or replace function public.revert_subject_merge');
    expect(sql).toContain('create or replace function public.revert_topic_merge');
    expect(sql).toContain("(select auth.uid()) is distinct from p_user_id");
    expect(sql).toContain("raise exception 'Not authorized'");
  });

  it('syncs unified topic progress before clearing merge flags', () => {
    expect(sql).toContain('set completed = v_primary_topic.completed');
    expect(sql).toContain('review_count = v_primary_topic.review_count');
    expect(sql).toContain('memory_stability = v_primary_topic.memory_stability');
    expect(sql).toContain('parent_topic_id = null');
    expect(sql).toContain('is_hidden = false');
    expect(sql).toContain('merged_with_ia = false');
  });

  it('keeps revert RPCs behind the service-role dispatcher boundary', () => {
    expect(sql).toContain("when 'revert_subject_merge' then");
    expect(sql).toContain("when 'revert_topic_merge' then");
    expect(sql).toContain('revoke all on function public.revert_subject_merge(uuid, uuid) from authenticated');
    expect(sql).toContain('revoke all on function public.revert_topic_merge(uuid, uuid) from authenticated');
    expect(sql).toContain('grant execute on function public.revert_subject_merge(uuid, uuid) to service_role');
    expect(sql).toContain('grant execute on function public.revert_topic_merge(uuid, uuid) to service_role');
  });
});
