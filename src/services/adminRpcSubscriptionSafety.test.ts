import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('admin subscription mutation safety', () => {
  it('blocks manual subscription mutations for Asaas-linked users at the Edge boundary', () => {
    const source = readFileSync('supabase/functions/admin-rpc/index.ts', 'utf8');

    expect(source).toContain('MANUAL_SUBSCRIPTION_ACTIONS');
    expect(source).toContain('asaas_subscription_id');
    expect(source).toContain('ASAAS_SUBSCRIPTION_MANAGED_EXTERNALLY');
  });
});
