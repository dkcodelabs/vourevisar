import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations_legacy/20260626192250_promote_surviving_subject_on_archive.sql',
);
const pruneMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations_legacy/20260627161607_prune_removed_subjects_from_cycle.sql',
);
const backfillMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations_legacy/20260627162043_backfill_cycle_active_subject_scope.sql',
);
const syncNameMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations_legacy/20260825200500_sync_cycle_name_on_archive.sql',
);

const readMigration = () => readFileSync(migrationPath, 'utf8');
const readPruneMigration = () => readFileSync(pruneMigrationPath, 'utf8');
const readBackfillMigration = () => readFileSync(backfillMigrationPath, 'utf8');
const readSyncNameMigration = () => readFileSync(syncNameMigrationPath, 'utf8');

describe('cycle archive persistence migration', () => {
  it('keeps the cycle row when the last edital is removed so manual subject state can be restored on reload', () => {
    const sql = readMigration();

    expect(sql).toContain('create or replace function public.atomic_archive_edital_from_cycle');
    expect(sql).not.toMatch(/delete\s+from\s+public\.user_cycles/i);
    expect(sql).toMatch(/set\s+ciclo_atual\s*=\s*'\{\}'::text\[\]/i);
    expect(sql).toMatch(/materias_estudadas_ciclo/i);
  });

  it('promotes the single surviving merged subject into ciclo_atual when the removed edital owned the primary subject', () => {
    const sql = readMigration();

    expect(sql).toMatch(/cardinality\(v_survivor_ids\)\s*=\s*1/i);
    expect(sql).toMatch(/v_subject_merge\.primary_subject_id\s*=\s*any\(v_removed_subject_ids\)/i);
    expect(sql).toMatch(/array_replace\(\s*coalesce\(v_cycle\.ciclo_atual,\s*'\{\}'::text\[\]\),\s*v_subject_merge\.primary_subject_id::text,\s*v_survivor_ids\[1\]::text\s*\)/i);
  });

  it('copies the strongest review state to the surviving topic when a topic merge collapses', () => {
    const sql = readMigration();

    expect(sql).toMatch(/with\s+best_topic_state\s+as/i);
    expect(sql).toMatch(/order\s+by\s+coalesce\(completed,\s*false\)\s+desc/i);
    expect(sql).toMatch(/review_count\s*=\s*greatest\(/i);
    expect(sql).toMatch(/where\s+survivor\.id\s*=\s*v_survivor_ids\[1\]/i);
  });

  it('rebuilds remaining edital active subjects before persisting the cycle after archive', () => {
    const sql = readPruneMigration();

    expect(sql).toContain('create or replace function public.atomic_archive_edital_from_cycle');
    expect(sql).toMatch(/update\s+public\.user_editais\s+remaining_edital/i);
    expect(sql).toMatch(/set\s+active_subject_ids\s*=\s*rebuilt\.active_subject_ids/i);
    expect(sql).toMatch(/remaining_edital\.user_id\s*=\s*p_user_id/i);
    expect(sql).toMatch(/and\s+remaining_edital\.merged_into_cycle\s*=\s*true/i);
    expect(sql).toMatch(/v_allowed_subject_ids/i);
    expect(sql).toMatch(/v_new_cycle\s*:=\s*'\{\}'::text\[\]/i);
    expect(sql).toMatch(/not\s+\(v_cycle_subject::uuid\s*=\s*any\(v_allowed_subject_ids\)\)/i);
  });

  it('backfills already corrupted active edital and cycle subject scopes', () => {
    const sql = readBackfillMigration();

    expect(sql).toMatch(/update\s+public\.user_editais\s+remaining_edital/i);
    expect(sql).toMatch(/set\s+active_subject_ids\s*=\s*rebuilt\.active_subject_ids/i);
    expect(sql).toMatch(/remaining_edital\.merged_into_cycle\s*=\s*true/i);
    expect(sql).toMatch(/update\s+public\.user_cycles\s+cycle/i);
    expect(sql).toMatch(/set\s+ciclo_atual\s*=\s*rebuilt_cycle\.ciclo_atual/i);
    expect(sql).toMatch(/active_subject_ids/i);
    expect(sql).toMatch(/merged_into_cycle\s*=\s*true/i);
  });

  it('synchronizes the remaining cycle name in the transaction when editais remain', () => {
    const sql = readSyncNameMigration();

    expect(sql).toContain('create or replace function public.atomic_archive_edital_from_cycle');
    expect(sql).toMatch(/v_remaining_cycle_name/i);
    expect(sql).toMatch(/string_agg\(\s*upper\(regexp_replace\(trim\(name\),\s*'\\s\+',\s*'\s*',\s*'g'\)\)/i);
    expect(sql).toMatch(/update\s+public\.user_cycles/i);
    expect(sql).toMatch(/set\s+name\s*=\s*coalesce\(v_remaining_cycle_name,\s*name\)/i);
  });
});
