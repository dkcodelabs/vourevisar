import { describe, expect, it } from 'vitest';

import { getSupportEmailUrl } from './support';

describe('support contact', () => {
  it('creates an email link with an encoded subject', () => {
    expect(getSupportEmailUrl('Ajuda para acessar a conta')).toBe(
      'mailto:vourevisar@gmail.com?subject=Ajuda%20para%20acessar%20a%20conta',
    );
  });
});
