import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260716130000_restore_visible_subjects_on_cycle_load.sql'),
  'utf8',
);

describe('restore visible subjects on cycle load migration', () => {
  it('reactivates every subject loaded into the active cycle', () => {
    expect(migration).toContain('create or replace function public.atomic_cycle_load');
    expect(migration).toContain('update public.subjects');
    expect(migration).toContain('set is_visible = true');
    expect(migration).toContain('and id::text = any(p_new_subject_ids)');
  });

  it('backfills existing active cycles so hidden loaded subjects become visible again', () => {
    expect(migration).toContain('from public.user_cycles uc');
    expect(migration).toContain("where uc.status = 'active'");
    expect(migration).toContain('and s.id::text = any(uc.ciclo_atual)');
  });

  it('keeps atomic_cycle_load behind the service-role dispatcher boundary', () => {
    expect(migration).toContain('revoke all on function public.atomic_cycle_load(uuid, uuid, text[], uuid[], text, text, date, boolean) from authenticated');
    expect(migration).toContain('grant execute on function public.atomic_cycle_load(uuid, uuid, text[], uuid[], text, text, date, boolean) to service_role');
  });
});
