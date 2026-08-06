import { describe, expect, it } from 'vitest';

import { compareEditaisByCreatedOrder } from './editalOrder';

describe('compareEditaisByCreatedOrder', () => {
  it('places the newest edital first', () => {
    const editais = [
      { createdAt: '2026-07-20T10:00:00.000Z' },
      { createdAt: '2026-07-22T10:00:00.000Z' },
      { createdAt: '2026-07-21T10:00:00.000Z' },
    ];

    expect(editais.sort(compareEditaisByCreatedOrder).map((edital) => edital.createdAt)).toEqual([
      '2026-07-22T10:00:00.000Z',
      '2026-07-21T10:00:00.000Z',
      '2026-07-20T10:00:00.000Z',
    ]);
  });

  it('keeps editais without a valid creation date after dated editais', () => {
    const editais = [
      { createdAt: null },
      { createdAt: '2026-07-22T10:00:00.000Z' },
      { createdAt: 'invalid' },
    ];

    expect(editais.sort(compareEditaisByCreatedOrder).map((edital) => edital.createdAt)).toEqual([
      '2026-07-22T10:00:00.000Z',
      null,
      'invalid',
    ]);
  });
});
