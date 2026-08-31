import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260831182253_optimize_core_study_rls_initplans.sql'),
  'utf8',
).replace(/\s+/g, ' ').toLowerCase();

describe('core study RLS initplan optimization', () => {
  it('keeps the existing ownership rules while evaluating auth once per query', () => {
    expect(migration).toContain('create policy "users can manage their own v2 cycles" on public.study_cycles_v2 using ((select auth.uid()) = user_id)');
    expect(migration).toContain('create policy "users can manage their own subject states" on public.cycle_subject_states using ((select auth.uid()) = user_id)');
    expect(migration).toContain('create policy "users can manage their own study logs" on public.cycle_study_logs using ((select auth.uid()) = user_id)');
    expect(migration).toContain('study_cycles_v2.user_id = (select auth.uid())');
  });

  it('does not widen the policy role or alter any other contract', () => {
    expect(migration).not.toMatch(/\b(to authenticated|to anon|grant |revoke |alter table|create function|drop table)\b/);
  });
});
