type SupabaseImportMetaEnv = {
  MODE?: string;
  PROD?: boolean;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
};

type ResolveSupabaseEnvOptions = {
  env: SupabaseImportMetaEnv;
};

type ResolvedSupabaseEnv = {
  url: string;
  publishableKey: string;
};

export function getMissingSupabaseDeployEnv(env: SupabaseImportMetaEnv): string[] {
  const missing: string[] = [];

  if (!env.VITE_SUPABASE_URL?.trim()) {
    missing.push('VITE_SUPABASE_URL');
  }

  if (!(env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY)?.trim()) {
    missing.push('VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY');
  }

  return missing;
}

const DEV_SUPABASE_URL = 'https://ebghgbzvdiytxuxmnvvt.supabase.co';
const DEV_SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZ2hnYnp2ZGl5dHh1eG1udnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NTg3NzcsImV4cCI6MjA2MzMzNDc3N30.vhTig84oUI__MlicbM_eXVuyHe_OMZRpKppD9tAcbjQ';

function requiredEnv(name: string, value: string | undefined): string {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`[Supabase] Missing required environment variable: ${name}`);
  }

  return normalized;
}

export function resolveSupabaseEnv({ env }: ResolveSupabaseEnvOptions): ResolvedSupabaseEnv {
  const url = env.VITE_SUPABASE_URL?.trim();
  const publishableKey = (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY)?.trim();

  if (env.PROD || env.MODE === 'production') {
    return {
      url: requiredEnv('VITE_SUPABASE_URL', url),
      publishableKey: requiredEnv('VITE_SUPABASE_PUBLISHABLE_KEY', publishableKey),
    };
  }

  return {
    url: url || DEV_SUPABASE_URL,
    publishableKey: publishableKey || DEV_SUPABASE_PUBLISHABLE_KEY,
  };
}
