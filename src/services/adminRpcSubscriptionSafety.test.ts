import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('admin subscription mutation safety', () => {
  it('does not expose legacy provider or subscription mutation actions', () => {
    const source = readFileSync('supabase/functions/admin-rpc/index.ts', 'utf8');

    expect(source).not.toContain('activate_paid_subscription');
    expect(source).not.toContain('activate_trial_subscription');
    expect(source).not.toContain('deactivate_subscription');
    expect(source).not.toContain('user_subscriptions');
    expect(source).not.toContain('ASAAS_');
    expect(source).not.toContain('asaas_');
  });

  it('resets AI quota through the authorized admin action without rewriting edital origin', () => {
    const source = readFileSync('supabase/functions/admin-rpc/index.ts', 'utf8');
    const migration = readFileSync('supabase/migrations_legacy/20260722012921_notify_ai_quota_reset.sql', 'utf8');

    expect(source).toContain('"reset_user_ai_quota"');
    expect(source).toContain('reset_user_ai_quota');
    expect(source).not.toContain('bypass-admin-grant');
    expect(migration).toContain('user_notifications');
    expect(migration).toContain("'admin_ai_quota_reset'");
    expect(migration).toContain("'Cota de IA liberada'");
  });
});
