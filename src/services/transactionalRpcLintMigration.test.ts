import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  'supabase/migrations/20260831212253_fix_transactional_rpc_lint.sql',
  'utf8',
);

describe('transactional RPC lint migration', () => {
  it('keeps each warned RPC and makes empty array defaults explicit', () => {
    for (const name of [
      'atomic_delete_subject',
      'reset_edital_study_progress',
      'atomic_cycle_load',
      'atomic_archive_edital_from_cycle',
      'revert_subject_merge',
      'revert_topic_merge',
      'sync_topic_merge_progress',
    ]) {
      expect(source).toContain(`CREATE OR REPLACE FUNCTION public.${name}`);
    }

    expect(source).not.toMatch(/(?:uuid|text)\[\]\s*:=\s*'\{\}'(?!::)/);
  });

  it('uses existence checks without retaining unread selected IDs', () => {
    expect(source).toContain('perform 1\n  from public.subjects subject');
    expect(source).toContain('perform 1\n  from public.topics t');
    expect(source).not.toContain('v_subject_id uuid;');
    expect(source).not.toContain('v_existing_cycle_subject_ids');
    expect(source).not.toContain('v_topic_id uuid;');
  });
});
