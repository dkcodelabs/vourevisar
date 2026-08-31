import { describe, expect, it } from 'vitest';

import { sortTopicsInStudyOrder } from './topicOrder';

describe('sortTopicsInStudyOrder', () => {
  it('keeps explicit edital numbering in natural ascending order even when persisted positions are stale', () => {
    const sorted = sortTopicsInStudyOrder([
      { id: 'eleven', name: '11. Crimes contra a administração', position: 1 },
      { id: 'one', name: '1. Princípios fundamentais', position: 11 },
      { id: 'two', name: '2. Administração pública', position: 10 },
      { id: 'one-one', name: '1.1. Aplicação dos princípios', position: 9 },
    ]);

    expect(sorted.map((topic) => topic.id)).toEqual(['one', 'one-one', 'two', 'eleven']);
  });

  it('preserves manual position for topics without an explicit numeric prefix', () => {
    const sorted = sortTopicsInStudyOrder([
      { id: 'b', name: 'Disposições finais', position: 2 },
      { id: 'a', name: 'Disposições gerais', position: 1 },
    ]);

    expect(sorted.map((topic) => topic.id)).toEqual(['a', 'b']);
  });
});
