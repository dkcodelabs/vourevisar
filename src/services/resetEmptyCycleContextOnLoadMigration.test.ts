import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations_legacy/20260712172622_reset_empty_cycle_context_on_load.sql',
);

const normalizeSql = (sql: string) => sql.replace(/\s+/g, ' ').trim().toLowerCase();

describe('reset empty cycle context on load migration', () => {
  const sql = normalizeSql(readFileSync(migrationPath, 'utf8'));

  it('resets cycle state when replacing from an empty active cycle', () => {
    expect(sql).toContain("v_existing_cycle_subject_ids text[] := '{}'");
    expect(sql).toContain("v_should_reset_cycle_state := p_reset_cycle_state or (p_mode = 'replace' and coalesce(array_length(v_existing_cycle_subject_ids, 1), 0) = 0)");
    expect(sql).toContain('ciclos_realizados = case when v_should_reset_cycle_state then 0 else ciclos_realizados end');
    expect(sql).toContain("materias_estudadas_ciclo = case when v_should_reset_cycle_state then '{}'::text[] else materias_estudadas_ciclo end");
    expect(sql).toContain("'cycle_state_reset', v_should_reset_cycle_state");
  });

  it('keeps atomic_cycle_load behind the service-role dispatcher boundary', () => {
    expect(sql).toContain('revoke all on function public.atomic_cycle_load(uuid, uuid, text[], uuid[], text, text, date, boolean) from authenticated');
    expect(sql).toContain('grant execute on function public.atomic_cycle_load(uuid, uuid, text[], uuid[], text, text, date, boolean) to service_role');
  });
});
