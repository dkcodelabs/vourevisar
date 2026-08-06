import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (path: string) =>
  readFileSync(resolve(process.cwd(), path), 'utf8');

const authContextSource = readProjectFile('src/contexts/AuthContext.tsx');
const resetPasswordSource = readProjectFile('src/pages/ResetPassword.tsx');
const sendAuthEmailSource = readProjectFile('supabase/functions/send-auth-email/index.ts');
const adminRpcSource = readProjectFile('supabase/functions/admin-rpc/index.ts');
const authMethodsMigration = readProjectFile(
  'supabase/migrations/20260806160246_expose_safe_auth_method_capabilities.sql',
);

describe('password recovery safety boundaries', () => {
  it('keeps credential callbacks out of the global auth bootstrap', () => {
    expect(authContextSource).toContain("location.pathname === '/auth/callback'");
    expect(authContextSource).toContain("location.pathname === '/reset-password'");
    expect(authContextSource.match(/authTransitionRef\.current !== authTransition/g)?.length).toBeGreaterThanOrEqual(3);
    expect(authContextSource).toContain('authTransitionRef.current === authTransition');
  });

  it('does not let recovery create a password for a Google-only account', () => {
    expect(resetPasswordSource).toContain('getMyAuthMethods()');
    expect(resetPasswordSource).toContain("Continue com Google");
    expect(resetPasswordSource).toContain("signOut({ scope: 'local' })");
  });

  it('suppresses recovery delivery without exposing the account method publicly', () => {
    expect(sendAuthEmailSource).toContain("case 'recovery'");
    expect(sendAuthEmailSource).toContain(".rpc('internal_get_auth_methods'");
    expect(sendAuthEmailSource).toContain('if (!authMethods[0].has_password)');
    expect(sendAuthEmailSource).toContain("delivery: 'suppressed'");
  });

  it('returns real auth methods to the authorized admin instead of inferring from avatars', () => {
    expect(adminRpcSource).toContain('.rpc("internal_get_auth_methods"');
    expect(adminRpcSource).toContain('has_password: capability?.has_password === true');
  });

  it('keeps password capability RPCs scoped to self or service role', () => {
    expect(authMethodsMigration).toContain('WHERE target.id = (SELECT auth.uid())');
    expect(authMethodsMigration).toContain(
      'REVOKE ALL ON FUNCTION public.get_my_auth_methods() FROM PUBLIC, anon',
    );
    expect(authMethodsMigration).toContain(
      'GRANT EXECUTE ON FUNCTION public.get_my_auth_methods() TO authenticated',
    );
    expect(authMethodsMigration).toContain(
      'REVOKE ALL ON FUNCTION public.internal_get_auth_methods(uuid) FROM PUBLIC, anon, authenticated',
    );
    expect(authMethodsMigration).toContain(
      'GRANT EXECUTE ON FUNCTION public.internal_get_auth_methods(uuid) TO service_role',
    );
  });

  it('removes recovery credentials from browser history after verification', () => {
    expect(resetPasswordSource).toContain("window.history.replaceState({}, document.title, '/reset-password')");
    expect(resetPasswordSource).not.toContain('url: window.location.href');
  });
});
