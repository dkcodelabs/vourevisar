import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const profileSource = readFileSync(
  resolve(process.cwd(), 'src/pages/Profile.tsx'),
  'utf8',
);

describe('Profile billing isolation', () => {
  it('keeps subscription state out of the personal profile surface', () => {
    expect(profileSource).not.toContain('useSubscriptionInfo');
    expect(profileSource).not.toContain('label="ASSINATURA"');
    expect(profileSource).not.toContain('Ver planos e opções');
  });
});
