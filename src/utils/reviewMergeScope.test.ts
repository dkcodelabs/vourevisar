import { describe, expect, it } from 'vitest';
import { dedupeMergedReviewTopics, expandReviewSubjectScope } from './reviewMergeScope';

describe('review merge scope', () => {
  it('includes secondary merged subjects when the cycle stores only the primary subject', () => {
    const scope = expandReviewSubjectScope(
      ['math-a'],
      [
        {
          primary_subject_id: 'math-a',
          merged_subject_ids: ['math-b'],
        },
      ],
    );

    expect(scope).toEqual(['math-a', 'math-b']);
  });

  it('keeps one row for merged topics and uses the strongest review progress', () => {
    const topics = [
      {
        id: 'crase-a',
        name: 'Crase',
        subject_id: 'portugues-a',
        review_count: 0,
        next_review: null,
      },
      {
        id: 'crase-b',
        name: 'Crase',
        subject_id: 'portugues-b',
        review_count: 1,
        next_review: '2026-08-01T00:00:00.000Z',
      },
      {
        id: 'acentuacao-a',
        name: 'Acentuação',
        subject_id: 'portugues-a',
        review_count: 0,
        next_review: null,
      },
    ];

    const deduped = dedupeMergedReviewTopics(topics, [
      {
        primary_topic_id: 'crase-a',
        merged_topic_ids: ['crase-b'],
        display_name: 'Crase',
      },
    ]);

    expect(deduped).toHaveLength(2);
    expect(deduped[0]).toMatchObject({
      id: 'crase-a',
      name: 'Crase',
      review_count: 1,
      next_review: '2026-08-01T00:00:00.000Z',
    });
    expect(deduped[1]).toMatchObject({ id: 'acentuacao-a' });
  });
});
