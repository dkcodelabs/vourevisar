import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260907145841_expose_last_expired_access_context.sql'),
  'utf8',
).toLowerCase();

describe('expired billing access context migration', () => {
  it('exposes only a sanitized, naturally expired access source', () => {
    expect(migration).toContain("source in ('trial', 'manual', 'goodwill')");
    expect(migration).toContain('revoked_at is null');
    expect(migration).toContain('ends_at <= now()');
    expect(migration).toContain("'last_expired_access'");
    expect(migration).toContain("when expired_grant_record.source = 'trial' then 'initial_trial'");
    expect(migration).toContain("else 'courtesy'");

    const responsePayload = migration.slice(migration.indexOf('return jsonb_build_object'));
    expect(responsePayload).not.toContain("'reason'");
  });

  it('keeps the overview RPC behind the Edge Function dispatcher', () => {
    expect(migration).toContain('caller_id uuid := auth.uid()');
    expect(migration).toContain("raise exception 'authentication_required'");
    expect(migration).toContain('security definer');
    expect(migration).toContain("set search_path to ''");
    expect(migration).toContain('revoke all on function public.get_stripe_billing_overview(boolean) from public, anon, authenticated');
    expect(migration).toContain('grant execute on function public.get_stripe_billing_overview(boolean) to service_role');
  });
});
