import { describe, expect, it } from 'vitest';

import { buildReviewOriginMetadata, formatReviewOriginLabel } from './reviewOriginLabels';

describe('reviewOriginLabels', () => {
  it('adds the position when the edital name does not already include it', () => {
    expect(formatReviewOriginLabel({
      id: 'edital-a',
      name: 'Receita Federal',
      position: 'Analista Tributário',
    })).toBe('Receita Federal - Analista Tributário');
  });

  it('does not duplicate the position already present in the edital name', () => {
    expect(formatReviewOriginLabel({
      id: 'edital-a',
      name: 'Receita Federal - Analista Tributário',
      position: 'Analista Tributário',
    })).toBe('Receita Federal - Analista Tributário');
  });

  it('shows a compact summary for merged review origins only inside composite cycles', () => {
    const metadata = buildReviewOriginMetadata({
      showInCompositeCycle: true,
      sourceEditalIds: ['edital-a', 'edital-b'],
      editais: [
        { id: 'edital-a', name: 'Teste A', position: 'Cargo A' },
        { id: 'edital-b', name: 'Teste B', position: 'Cargo B' },
      ],
    });

    expect(metadata).toEqual({
      labels: ['Teste A - Cargo A', 'Teste B - Cargo B'],
      summary: 'Teste A - Cargo A + Teste B - Cargo B',
      isMergedOrigin: true,
      shouldShow: true,
    });
  });

  it('keeps origin metadata available but hidden for single-edital cycles', () => {
    const metadata = buildReviewOriginMetadata({
      showInCompositeCycle: false,
      sourceEditalIds: ['edital-a'],
      editais: [
        { id: 'edital-a', name: 'Teste A', position: 'Cargo A' },
      ],
    });

    expect(metadata.summary).toBe('Teste A - Cargo A');
    expect(metadata.shouldShow).toBe(false);
  });
});
