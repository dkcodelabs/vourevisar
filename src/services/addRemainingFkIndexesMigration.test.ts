import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260831182130_add_remaining_fk_indexes.sql'),
  'utf8',
).replace(/\s+/g, ' ').toLowerCase();

describe('remaining foreign-key index migration', () => {
  it('adds only the three foreign-key indexes identified by the remote advisor', () => {
    expect(migration).toContain('create index if not exists idx_admin_alert_events_acknowledged_by on public.admin_alert_events (acknowledged_by)');
    expect(migration).toContain('create index if not exists idx_flashcard_schedules_item_id on public.flashcard_schedules (item_id)');
    expect(migration).toContain('create index if not exists idx_subject_merges_cycle_id on public.subject_merges (cycle_id)');
  });

  it('does not change policy, grant, table, or function contracts', () => {
    expect(migration).not.toMatch(/\b(alter table|create policy|drop policy|grant |revoke |create function|drop table)\b/);
  });
});
