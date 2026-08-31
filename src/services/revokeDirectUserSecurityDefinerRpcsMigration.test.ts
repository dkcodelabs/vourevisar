import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');
const migration = readProjectFile(
  'supabase/migrations/20260831181056_revoke_direct_user_security_definer_rpcs.sql',
).replace(/\s+/g, ' ').toLowerCase();

describe('direct user security definer RPC retirement', () => {
  it('routes self-scoped capabilities through the authenticated Edge dispatcher', () => {
    expect(migration).toContain("when 'get_my_auth_methods' then");
    expect(migration).toContain("when 'get_stripe_billing_overview' then");
    expect(migration).toContain('public.get_stripe_billing_overview');
  });

  it('revokes browser execution while preserving the service role contract', () => {
    for (const signature of [
      'get_my_auth_methods()',
      'get_stripe_billing_overview(boolean)',
      'get_subscription_info(uuid)',
      'get_user_ai_limits(uuid)',
    ]) {
      expect(migration).toMatch(new RegExp(`revoke all on function public\\.${signature.replace(/[()]/g, '\\$&')} from public, anon, authenticated`));
      expect(migration).toContain(`grant execute on function public.${signature} to service_role`);
    }
  });

  it('does not leave the browser calling the privileged RPCs directly', () => {
    const authMethods = readProjectFile('src/services/authMethodsService.ts');
    const billing = readProjectFile('src/features/billing/services/stripeBillingService.ts');

    expect(authMethods).toContain("invokeUserRpc<unknown>('get_my_auth_methods')");
    expect(authMethods).not.toContain("supabase.rpc('get_my_auth_methods')");
    expect(billing).toContain("invokeUserRpc<BillingOverview>('get_stripe_billing_overview'");
    expect(billing).not.toContain("billingClient.rpc('get_stripe_billing_overview'");
  });
});
