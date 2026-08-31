import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260831210950_fix_billing_overview_customer_timestamp.sql';

const readMigration = () => readFileSync(migrationPath, 'utf8').toLowerCase();

describe('billing overview customer timestamp migration', () => {
  it('keeps the live-mode and ownership filters without rejecting an older active subscription', () => {
    const sql = readMigration();

    expect(sql).toContain('create or replace function public.get_stripe_billing_overview');
    expect(sql).toContain('customer.livemode = p_livemode');
    expect(sql).toContain('subscription.user_id = caller_id');
    expect(sql).not.toContain('subscription.updated_at >= coalesce(current_customer_updated_at');
    expect(sql).not.toContain('current_customer_updated_at timestamptz');
  });
});
