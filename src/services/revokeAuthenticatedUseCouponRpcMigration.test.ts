import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260707124258_revoke_authenticated_use_coupon_rpc.sql',
);

describe('revoke authenticated use coupon rpc migration', () => {
  it('removes direct browser access to coupon consumption', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(/revoke all on function public\.use_coupon\(text, uuid, text\) from authenticated/i);
  });
});
