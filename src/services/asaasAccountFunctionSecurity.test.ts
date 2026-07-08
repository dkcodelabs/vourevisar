import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('asaas-account Edge Function boundary', () => {
  it('validates the authenticated user and never accepts a subscription id from the request body', () => {
    const source = readFileSync('supabase/functions/asaas-account/index.ts', 'utf8');

    expect(source).toContain('auth.getUser(token)');
    expect(source).toContain(".eq('user_id', user.id)");
    expect(source).toContain('/subscriptions/${subscription.asaas_subscription_id}');
    expect(source).not.toContain('params.subscriptionId');
    expect(source).not.toContain('asaas-admin');
  });
});
