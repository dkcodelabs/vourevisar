import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('Asaas annual migration safety contract', () => {
  it('does not mutate an active subscription to schedule a different plan', () => {
    const source = readSource('supabase/functions/asaas-change-plan/index.ts');

    expect(source).toContain('PLAN_CHANGE_AFTER_PERIOD_ONLY');
    expect(source).toContain('Nenhuma assinatura ativa é alterada automaticamente');
    expect(source).not.toContain("cycle: 'YEARLY'");
    expect(source).not.toContain('updatePendingPayments: true');
  });

  it('does not apply the local annual plan before payment confirmation', () => {
    const source = readSource('supabase/functions/asaas-webhook/index.ts');

    expect(source).toContain("const plan = mapCycle(asaasSubscription?.cycle) || subscription.plan || 'monthly';");
    expect(source).toContain("event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED'");
    expect(source).toContain("status: 'active'");
    expect(source).toContain('next_billing_date:');
  });
});
