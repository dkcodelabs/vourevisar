import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260707124414_move_validate_coupon_to_edge.sql',
);

describe('move validate coupon to edge migration', () => {
  it('removes direct authenticated access to validate coupon rpc', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(/revoke all on function public\.validate_coupon\(text\) from authenticated/i);
  });
});
