import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260907152500_add_activation_funnel_events.sql'),
  'utf8',
).toLowerCase();

describe('activation funnel event migration', () => {
  it('extends only the existing event allowlist', () => {
    for (const event of [
      'activation_viewed',
      'activation_method_selected',
      'activation_edital_ready',
      'activation_cycle_ready',
      'activation_completed',
      'access_recovery_viewed',
      'access_recovery_checkout_started',
    ]) {
      expect(migration).toContain(`'${event}'`);
    }

    expect(migration).not.toMatch(/\b(create policy|grant |revoke |create function|drop table|insert into|update |delete from)\b/);
  });
});
