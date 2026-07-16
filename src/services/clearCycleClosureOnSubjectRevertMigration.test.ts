import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260716152000_clear_cycle_closure_on_subject_revert.sql'),
  'utf8',
);

describe('clear cycle closure on subject revert migration', () => {
  it('removes reverted subject ids from manual cycle closure state', () => {
    expect(sql).toContain('materias_estudadas_ciclo');
    expect(sql).toContain('v_current_studied_subjects');
    expect(sql).toContain('v_new_studied_subjects');
    expect(sql).toContain('where studied_id <> all');
    expect(sql).toContain('cleared_cycle_closure_subject_ids');
  });

  it('keeps topic progress synchronized while separating the subject merge', () => {
    expect(sql).toContain('set completed = v_primary_topic.completed');
    expect(sql).toContain('first_studied_at = v_primary_topic.first_studied_at');
    expect(sql).toContain('parent_topic_id = null');
    expect(sql).toContain('is_hidden = false');
  });

  it('keeps the subject revert RPC behind the service-role dispatcher boundary', () => {
    expect(sql).toContain('revoke all on function public.revert_subject_merge(uuid, uuid) from authenticated');
    expect(sql).toContain('grant execute on function public.revert_subject_merge(uuid, uuid) to service_role');
  });
});
