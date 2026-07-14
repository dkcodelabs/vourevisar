import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260712190641_reset_cycle_state_on_replace.sql',
);

const normalizeSql = (sql: string) => sql.replace(/\s+/g, ' ').trim().toLowerCase();

describe('reset cycle state on replace migration', () => {
  const sql = normalizeSql(readFileSync(migrationPath, 'utf8'));

  it('resets operational cycle state on every replace load', () => {
    expect(sql).toContain("v_should_reset_cycle_state := p_reset_cycle_state or p_mode = 'replace'");
    expect(sql).toContain('ciclos_realizados = case when v_should_reset_cycle_state then 0 else ciclos_realizados end');
    expect(sql).toContain("materias_estudadas_ciclo = case when v_should_reset_cycle_state then '{}'::text[] else materias_estudadas_ciclo end");
    expect(sql).toContain('indice_atual = case when v_should_reset_cycle_state then 0 else indice_atual end');
  });

  it('keeps atomic_cycle_load callable only through the service role dispatcher', () => {
    expect(sql).toContain('revoke all on function public.atomic_cycle_load(uuid, uuid, text[], uuid[], text, text, date, boolean) from authenticated');
    expect(sql).toContain('grant execute on function public.atomic_cycle_load(uuid, uuid, text[], uuid[], text, text, date, boolean) to service_role');
  });
});
