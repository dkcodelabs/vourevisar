import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260831184057_optimize_user_owned_rls_policies.sql'),
  'utf8',
).replace(/\s+/g, ' ').toLowerCase();

describe('user-owned RLS policy optimization', () => {
  it('moves direct ownership checks into initplans without changing policy scope', () => {
    expect(migration).toContain('alter policy "users can view their own api usage" on public.api_usage using ((select auth.uid()) = user_id)');
    expect(migration).toContain('alter policy "users can view own cycle study events" on public.cycle_study_events using ((select auth.uid()) = user_id)');
    expect(migration).toContain('alter policy "users can cancel own ai extraction jobs" on public.ai_extraction_jobs using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))');
    expect(migration).toContain('alter policy "users can manage their own pending extractions" on public.pending_ai_extractions using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)');
  });

  it('removes only the exact duplicate notification policies', () => {
    expect(migration).toContain('drop policy if exists "users_view_own_notifications" on public.user_notifications');
    expect(migration).toContain('drop policy if exists "users_update_own_notifications" on public.user_notifications');
    expect(migration).not.toMatch(/\b(grant |revoke |alter table|create function|drop table)\b/);
  });
});
