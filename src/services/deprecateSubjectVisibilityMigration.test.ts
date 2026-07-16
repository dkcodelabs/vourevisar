import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260716131500_deprecate_subject_visibility_for_students.sql'),
  'utf8',
);

describe('deprecate subject visibility for students migration', () => {
  it('normalizes all subjects to visible', () => {
    expect(migration).toContain('update public.subjects');
    expect(migration).toContain('set is_visible = true');
    expect(migration).toContain('where is_visible is distinct from true');
  });
});
