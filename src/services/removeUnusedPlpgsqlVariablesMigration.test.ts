import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260831190000_remove_unused_plpgsql_variables.sql';

const readMigration = () => readFileSync(migrationPath, 'utf8').toLowerCase();

describe('remove unused PL/pgSQL variables migration', () => {
  it('redefines only the four linted functions and removes their unused declarations', () => {
    const sql = readMigration();

    expect(sql).toContain('create or replace function public.test_difficulty_system()');
    expect(sql).toContain('create or replace function public.log_user_event(');
    expect(sql).toContain('create or replace function public.update_daily_progress(');
    expect(sql).not.toContain('sample_user uuid');
    expect(sql).not.toContain('v_dedupe_key text');
    expect(sql).not.toContain('v_session_fingerprint text');
    expect(sql).not.toContain('daily_goal integer');
  });
});
