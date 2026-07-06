import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260705221040_add_study_session_contact_type.sql',
);

const readMigration = () => readFileSync(migrationPath, 'utf8');

describe('study session contact type migration', () => {
  it('adds a conservative classification with a closed set of values', () => {
    const sql = readMigration();

    expect(sql).toMatch(/add column if not exists contact_type text not null default 'unclassified'/i);
    expect(sql).toMatch(/add constraint study_sessions_contact_type_check/i);

    for (const contactType of [
      'first_contact',
      'review',
      'continuation',
      'mixed',
      'subject_session',
      'unclassified',
    ]) {
      expect(sql).toContain(`'${contactType}'`);
    }
  });

  it('does not weaken existing study session access control', () => {
    const sql = readMigration();

    expect(sql).not.toMatch(/disable row level security/i);
    expect(sql).not.toMatch(/drop policy/i);
    expect(sql).not.toMatch(/grant .* anon/i);
  });
});
