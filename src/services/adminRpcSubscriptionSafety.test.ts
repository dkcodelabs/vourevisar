import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('admin subscription mutation safety', () => {
  it('closes an active Asaas link before a manual subscription mutation', () => {
    const source = readFileSync('supabase/functions/admin-rpc/index.ts', 'utf8');

    expect(source).toContain('MANUAL_SUBSCRIPTION_ACTIONS');
    expect(source).toContain('asaas_subscription_id');
    expect(source).toContain('deactivateExternalSubscriptionIfActive');
    expect(source).toContain('ASAAS_API_KEY');
    expect(source).toContain('method: "PUT"');
    expect(source).toContain('status: "INACTIVE"');
    expect(source).not.toContain('ASAAS_SUBSCRIPTION_MANAGED_EXTERNALLY');
  });

  it('resets AI quota through the authorized admin action without rewriting edital origin', () => {
    const source = readFileSync('supabase/functions/admin-rpc/index.ts', 'utf8');
    const migration = readFileSync('supabase/migrations/20260722012921_notify_ai_quota_reset.sql', 'utf8');

    expect(source).toContain('"reset_user_ai_quota"');
    expect(source).toContain('reset_user_ai_quota');
    expect(source).not.toContain('bypass-admin-grant');
    expect(migration).toContain('user_notifications');
    expect(migration).toContain("'admin_ai_quota_reset'");
    expect(migration).toContain("'Cota de IA liberada'");
  });
});
