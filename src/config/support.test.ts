import { describe, expect, it } from 'vitest';

import { getSupportWhatsAppUrl } from './support';

describe('support contact', () => {
  it('creates a WhatsApp link with an encoded message', () => {
    expect(getSupportWhatsAppUrl('Minha conta foi desativada.')).toBe(
      'https://wa.me/5527998984866?text=Minha%20conta%20foi%20desativada.',
    );
  });
});
