import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');
const migration = readProjectFile(
  'supabase/migrations/20260905020728_add_atomic_cycle_rotation_snapshots.sql',
).replace(/\s+/g, ' ').toLowerCase();

describe('atomic cycle rotation snapshots migration', () => {
  it('locks the active cycle and makes retries idempotent', () => {
    expect(migration).toContain("and status = 'active' for update");
    expect(migration).toContain('p_expected_cycle_number < v_actual_cycle_number');
    expect(migration).toContain('on conflict (user_cycle_id, cycle_number) do nothing');
  });

  it('persists the snapshot before advancing the cycle counter', () => {
    const snapshotInsert = migration.indexOf('insert into public.cycle_rotation_snapshots');
    const cycleUpdate = migration.indexOf("materias_estudadas_ciclo = '{}'::text[]");

    expect(snapshotInsert).toBeGreaterThan(-1);
    expect(cycleUpdate).toBeGreaterThan(snapshotInsert);
    expect(migration).toContain('topics_started_count');
    expect(migration).toContain('topics_completed_count');
    expect(migration).toContain('per_subject');
  });

  it('keeps snapshots read-only for authenticated clients', () => {
    expect(migration).toContain('revoke all on table public.cycle_rotation_snapshots from anon, authenticated');
    expect(migration).toContain('grant select on table public.cycle_rotation_snapshots to authenticated');
    expect(migration).toContain('using ((select auth.uid()) = user_id)');
    expect(migration).toContain('revoke all on function public.advance_cycle_rotation(uuid, uuid, uuid, integer) from public, anon, authenticated');
    expect(migration).toContain('grant execute on function public.advance_cycle_rotation(uuid, uuid, uuid, integer) to service_role');
  });

  it('routes the action through the authenticated Edge dispatcher', () => {
    const edgeFunction = readProjectFile('supabase/functions/user-rpc/index.ts');
    const service = readProjectFile('src/services/cycleRotationService.ts');

    expect(migration).toContain("when 'advance_cycle_rotation' then");
    expect(edgeFunction).toContain('"advance_cycle_rotation"');
    expect(edgeFunction).toContain('case "advance_cycle_rotation":');
    expect(service).toContain("invokeUserRpc<AdvanceCycleRotationResult>('advance_cycle_rotation'");
  });
});
