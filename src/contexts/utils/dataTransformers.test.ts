import { describe, expect, it } from 'vitest';

import { transformSubjectsData } from './dataTransformers';

describe('transformSubjectsData', () => {
  it('preserves topic active state used by cycle metrics', () => {
    const [subject] = transformSubjectsData([
      {
        id: 'subject-1',
        name: 'Materia',
        status: 'Nova',
        topics: [
          {
            id: 'topic-active',
            name: 'Ativo',
            completed: false,
            review_count: 0,
            is_active: true,
          },
          {
            id: 'topic-inactive',
            name: 'Inativo',
            completed: false,
            review_count: 0,
            is_active: false,
          },
        ],
      },
    ]);

    expect(subject.topics).toEqual([
      expect.objectContaining({ id: 'topic-active', is_active: true }),
      expect.objectContaining({ id: 'topic-inactive', is_active: false }),
    ]);
  });
});
