import { describe, expect, it } from 'vitest';
import { getMissingSupabaseDeployEnv, resolveSupabaseEnv } from './env';

describe('resolveSupabaseEnv', () => {
  it('accepts the legacy anon key in deploy validation', () => {
    expect(
      getMissingSupabaseDeployEnv({
        VITE_SUPABASE_URL: 'https://project.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'legacy-anon-key',
      }),
    ).toEqual([]);
  });

  it('throws in production when Supabase URL is missing', () => {
    expect(() =>
      resolveSupabaseEnv({
        env: {
          MODE: 'production',
          PROD: true,
          VITE_SUPABASE_PUBLISHABLE_KEY: 'anon-key',
        },
      }),
    ).toThrow('VITE_SUPABASE_URL');
  });

  it('throws in production when Supabase publishable key is missing', () => {
    expect(() =>
      resolveSupabaseEnv({
        env: {
          MODE: 'production',
          PROD: true,
          VITE_SUPABASE_URL: 'https://project.supabase.co',
        },
      }),
    ).toThrow('VITE_SUPABASE_PUBLISHABLE_KEY');
  });

  it('resolves explicit production Supabase env values', () => {
    expect(
      resolveSupabaseEnv({
        env: {
          MODE: 'production',
          PROD: true,
          VITE_SUPABASE_URL: 'https://project.supabase.co',
          VITE_SUPABASE_PUBLISHABLE_KEY: 'anon-key',
        },
      }),
    ).toEqual({
      url: 'https://project.supabase.co',
      publishableKey: 'anon-key',
    });
  });
});
