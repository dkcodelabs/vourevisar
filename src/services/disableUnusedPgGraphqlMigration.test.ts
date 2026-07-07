import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260707121121_disable_unused_pg_graphql.sql',
);

const readMigration = () => readFileSync(migrationPath, 'utf8');

describe('disable unused pg_graphql migration', () => {
  it('removes the unused GraphQL extension without changing table grants', () => {
    const sql = readMigration();

    expect(sql).toMatch(/drop\s+extension\s+if\s+exists\s+pg_graphql/i);
    expect(sql).not.toMatch(/revoke\s+.*\s+on\s+table\s+public\.study_sessions/i);
    expect(sql).not.toMatch(/drop\s+policy/i);
    expect(sql).not.toMatch(/disable\s+row\s+level\s+security/i);
  });
});
