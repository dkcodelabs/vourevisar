import { describe, expect, it } from 'vitest';

import { getStudyEmptyStateKind } from '@/utils/studyEntryState';

describe('getStudyEmptyStateKind', () => {
  it.each([
    ['sem edital', { editalCount: 0, editaisWithContentCount: 0, hasActiveCycle: false }, 'no-edital'],
    ['edital vazio', { editalCount: 1, editaisWithContentCount: 0, hasActiveCycle: false }, 'empty-edital'],
    ['edital com conteúdo fora do ciclo', { editalCount: 1, editaisWithContentCount: 1, hasActiveCycle: false }, 'no-cycle'],
    ['ciclo carregado', { editalCount: 1, editaisWithContentCount: 1, hasActiveCycle: true }, null],
  ] as const)('classifies the persisted entry state: %s', (_label, input, expected) => {
    expect(getStudyEmptyStateKind(input)).toBe(expected);
  });

  it('separates first access from an existing empty edital', () => {
    expect(getStudyEmptyStateKind({ editalCount: 0, editaisWithContentCount: 0, hasActiveCycle: false })).toBe('no-edital');
    expect(getStudyEmptyStateKind({ editalCount: 1, editaisWithContentCount: 0, hasActiveCycle: false })).toBe('empty-edital');
  });

  it('keeps a ready edital without a cycle actionable', () => {
    expect(getStudyEmptyStateKind({ editalCount: 2, editaisWithContentCount: 1, hasActiveCycle: false })).toBe('no-cycle');
  });

  it('uses loaded subject content even when edital origins are not ready yet', () => {
    expect(getStudyEmptyStateKind({
      editalCount: 0,
      editaisWithContentCount: 0,
      hasAnyContent: true,
      hasActiveCycle: false,
    })).toBe('no-cycle');
  });

  it('does not replace a loaded cycle with an empty-state banner', () => {
    expect(getStudyEmptyStateKind({ editalCount: 1, editaisWithContentCount: 1, hasActiveCycle: true })).toBeNull();
  });
});
