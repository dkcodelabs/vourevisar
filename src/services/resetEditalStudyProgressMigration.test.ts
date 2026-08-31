import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations_legacy/20260711120000_reset_edital_study_progress.sql',
);

const readMigration = () => readFileSync(migrationPath, 'utf8').toLowerCase();

describe('reset edital study progress migration', () => {
  it('adds the reset RPC and exposes it only through the service-role dispatcher', () => {
    const sql = readMigration();

    expect(sql).toContain('create or replace function public.reset_edital_study_progress');
    expect(sql).toContain("when 'reset_edital_study_progress' then");
    expect(sql).toContain('grant execute on function public.reset_edital_study_progress(uuid, uuid) to service_role');
    expect(sql).toContain('revoke all on function public.reset_edital_study_progress(uuid, uuid) from authenticated');
  });

  it('preserves existing dispatcher argument contracts while adding the new action', () => {
    const sql = readMigration();

    expect(sql).toContain("p_args->>'p_error_id'");
    expect(sql).toContain("p_args->>'p_context_label'");
    expect(sql).toContain("p_args->>'p_origin'");
    expect(sql).toContain("p_args->>'p_status'");
    expect(sql).toContain("p_args->'p_history'");
  });
});
