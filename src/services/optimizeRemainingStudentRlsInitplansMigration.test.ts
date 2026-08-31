import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260831185325_optimize_remaining_student_rls_initplans.sql'),
  'utf8',
).replace(/\s+/g, ' ').toLowerCase();

describe('remaining student RLS policy optimization', () => {
  it('evaluates direct student ownership checks once without changing access scope', () => {
    expect(migration).toContain('alter policy "users can view their own ai usage logs" on public.ai_usage_logs using ((select auth.uid()) = user_id)');
    expect(migration).toContain('alter policy "authors can manage own comments" on public.comments using (author_id = (select auth.uid()))');
    expect(migration).toContain('alter policy "users can manage their own cycle rotation snapshots" on public.cycle_rotation_snapshots using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)');
    expect(migration).toContain('alter policy "users can manage their own pending merges" on public.pending_cycle_merges using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)');
    expect(migration).toContain('alter policy "users can manage own subject relations" on public.subject_relations using ((select auth.uid()) = user_id)');
  });

  it('keeps administrative and financial policy contracts out of this migration', () => {
    expect(migration).toContain('alter policy "notifications_insert_policy" on public.notifications with check (user_id = (select auth.uid()))');
    expect(migration).toContain('alter policy "users can insert own feedback" on public.user_feedback_events with check (actor_user_id = (select auth.uid()))');
    expect(migration).toContain('alter policy "users can view own feedback" on public.user_feedback_events using (actor_user_id = (select auth.uid()))');
    expect(migration).toContain('alter policy "authors can manage own posts" on public.posts using (author_id = (select auth.uid()))');
    expect(migration).not.toMatch(/\b(grant |revoke |drop policy|alter table|create function|drop table)\b/);
  });
});
