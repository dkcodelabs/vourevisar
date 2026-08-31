import { describe, expect, it } from 'vitest';
import { buildTopicReviewHistory } from './useTopicReviewHistory';

describe('buildTopicReviewHistory', () => {
  it('deriva o histórico somente dos contatos e da agenda adaptativa do tópico', () => {
    const history = buildTopicReviewHistory(
      [
        {
          id: 'first-contact',
          topic_id: 'topic-1',
          review_stage: 'Primeiro Contato',
          reviewed_at: '2026-08-01T10:00:00.000Z',
          created_at: '2026-08-01T10:00:00.000Z',
          study_duration_minutes: 20,
          difficulty_numeric: 2,
          trend_label: null,
          trend_delta: null,
        },
        {
          id: 'review-1',
          topic_id: 'topic-1',
          review_stage: 'Revisão 1',
          reviewed_at: '2026-08-02T10:00:00.000Z',
          created_at: '2026-08-02T10:00:00.000Z',
          study_duration_minutes: 10,
          difficulty_numeric: 1,
          trend_label: 'Melhorando',
          trend_delta: -1,
        },
      ],
      {
        first_studied_at: '2026-08-01T10:00:00.000Z',
        review_stage: 'Revisão 2',
        next_review: '2026-12-20T10:00:00.000Z',
        review_count: 2,
        last_reviewed_at: '2026-08-02T10:00:00.000Z',
        completed: false,
      },
      new Date('2026-08-03T12:00:00.000Z'),
    );

    expect(history.firstContact?.toISOString()).toBe('2026-08-01T10:00:00.000Z');
    expect(history.completedReviews).toBe(1);
    expect(history.nextReviews).toHaveLength(1);
    expect(history.nextReviews[0]).toMatchObject({ stage: '2', isFuture: true });
    expect(history.latestTrendLabel).toBe('Melhorando');
  });
});
