import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type VercelHeader = {
  key: string;
  value: string;
};

type VercelConfig = {
  headers?: Array<{
    source: string;
    headers: VercelHeader[];
  }>;
};

const config = JSON.parse(
  readFileSync(join(process.cwd(), 'vercel.json'), 'utf8'),
) as VercelConfig;

const globalHeaders = Object.fromEntries(
  config.headers
    ?.find((entry) => entry.source === '/(.*)')
    ?.headers.map((header) => [header.key, header.value]) ?? [],
);

describe('vercel security headers', () => {
  it('keeps a restrictive Content Security Policy for production', () => {
    const policy = globalHeaders['Content-Security-Policy'];

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain('https://*.supabase.co');
    expect(policy).toContain('wss://*.supabase.co');
    expect(policy).toContain('https://js.stripe.com');
    expect(policy).toContain('https://*.js.stripe.com');
    expect(policy).toContain('https://hooks.stripe.com');
    expect(policy).toContain('https://*.stripe.com');
  });

  it('blocks unnecessary browser capabilities while allowing same-origin payment flows', () => {
    expect(globalHeaders['Permissions-Policy']).toContain('camera=()');
    expect(globalHeaders['Permissions-Policy']).toContain('microphone=()');
    expect(globalHeaders['Permissions-Policy']).toContain('geolocation=()');
    expect(globalHeaders['Permissions-Policy']).toContain('payment=(self)');
  });

  it('enforces HTTPS after first secure load', () => {
    expect(globalHeaders['Strict-Transport-Security']).toBe(
      'max-age=63072000; includeSubDomains',
    );
  });
});
