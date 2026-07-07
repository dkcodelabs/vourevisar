import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260707125432_remove_email_assets_listing_policy.sql',
);

describe('remove email assets listing policy migration', () => {
  it('drops the broad storage listing policy for email assets', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(/drop policy if exists "Email assets are publicly accessible" on storage\.objects/i);
  });
});
