import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260705221633_secure_study_session_access_and_indexes.sql',
);

const normalizeSql = (sql: string) => sql.replace(/\s+/g, ' ').trim().toLowerCase();

const readMigration = () => readFileSync(migrationPath, 'utf8');

describe('study session access and index migration', () => {
  it('removes anonymous Data API access without breaking authenticated writers', () => {
    const sql = normalizeSql(readMigration());

    expect(sql).toContain('revoke all on table public.study_sessions from anon');
    expect(sql).toContain(
      'grant select, insert, update, delete on table public.study_sessions to authenticated',
    );
    expect(sql).toContain(
      'grant select, insert, update, delete on table public.study_sessions to service_role',
    );
  });

  it('adds covering indexes for study session foreign keys reported by the advisor', () => {
    const sql = normalizeSql(readMigration());

    expect(sql).toContain(
      'create index if not exists idx_study_sessions_cycle_id on public.study_sessions (cycle_id) where cycle_id is not null',
    );
    expect(sql).toContain(
      'create index if not exists idx_study_sessions_edital_id on public.study_sessions (edital_id) where edital_id is not null',
    );
  });

  it('does not weaken row-level security or ownership policies', () => {
    const sql = readMigration();

    expect(sql).not.toMatch(/disable row level security/i);
    expect(sql).not.toMatch(/drop policy/i);
    expect(sql).not.toMatch(/using\s*\(\s*true\s*\)/i);
  });
});
