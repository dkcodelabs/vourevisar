import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations_legacy/20260712172110_reset_cycle_state_on_zero_study.sql',
);

const normalizeSql = (sql: string) => sql.replace(/\s+/g, ' ').trim().toLowerCase();

describe('reset cycle state on zero study migration', () => {
  const sql = normalizeSql(readFileSync(migrationPath, 'utf8'));

  it('extends atomic_cycle_load with an explicit reset-cycle-state flag', () => {
    expect(sql).toContain('p_reset_cycle_state boolean default false');
    expect(sql).toContain("coalesce((p_args->>'p_reset_cycle_state')::boolean, false)");
    expect(sql).toContain('grant execute on function public.atomic_cycle_load(uuid, uuid, text[], uuid[], text, text, date, boolean) to service_role');
    expect(sql).toContain('revoke all on function public.atomic_cycle_load(uuid, uuid, text[], uuid[], text, text, date, boolean) from authenticated');
  });

  it('resets active cycle counters and strategic history when studying from zero', () => {
    expect(sql).toContain('delete from public.cycle_study_events');
    expect(sql).toContain('delete from public.cycle_rotation_snapshots');
    expect(sql).toContain('ciclos_realizados = case when p_reset_cycle_state then 0 else ciclos_realizados end');
    expect(sql).toContain("materias_estudadas_ciclo = case when p_reset_cycle_state then '{}'::text[] else materias_estudadas_ciclo end");
    expect(sql).toContain('indice_atual = case when p_reset_cycle_state then 0 else indice_atual end');
    expect(sql).toContain('data_inicio_ciclo = case when p_reset_cycle_state then v_now else data_inicio_ciclo end');
    expect(sql).toContain('data_fim_ciclo = case when p_reset_cycle_state then null else data_fim_ciclo end');
  });
});
