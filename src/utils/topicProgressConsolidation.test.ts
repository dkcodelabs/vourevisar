import { describe, expect, it } from 'vitest';
import { buildConsolidatedTopicProgress } from './topicProgressConsolidation';

describe('buildConsolidatedTopicProgress', () => {
  it('consolidates merged topic progress using the safest advanced state', () => {
    const consolidated = buildConsolidatedTopicProgress([
      {
        completed: false,
        current_interval: 7,
        difficulty_level: 1,
        first_studied_at: '2026-07-05T10:00:00.000Z',
        last_reviewed_at: '2026-07-06T10:00:00.000Z',
        memory_stability: 3,
        next_review: '2026-07-09T10:00:00.000Z',
        retention_score: 0.6,
        review_count: 2,
        review_stage: '7d',
        total_reviews: 2,
      },
      {
        completed: true,
        current_interval: 30,
        difficulty_level: 3,
        difficulty_set_at: '2026-07-07T10:00:00.000Z',
        first_studied_at: '2026-07-01T10:00:00.000Z',
        last_reviewed_at: '2026-07-08T10:00:00.000Z',
        last_session_duration: 20,
        memory_stability: 8,
        next_review: '2026-08-08T10:00:00.000Z',
        retention_score: 0.9,
        review_count: 4,
        review_stage: '30d',
        total_reviews: 4,
      },
    ]);

    expect(consolidated).toMatchObject({
      completed: true,
      current_interval: 30,
      difficulty_level: 3,
      first_studied_at: '2026-07-01T10:00:00.000Z',
      last_reviewed_at: '2026-07-08T10:00:00.000Z',
      last_session_duration: 20,
      memory_stability: 8,
      next_review: null,
      retention_score: 0.9,
      review_count: 4,
      review_stage: 'Concluído',
      total_reviews: 4,
    });
  });

  it('keeps the most urgent next review when the group is not completed', () => {
    const consolidated = buildConsolidatedTopicProgress([
      { completed: false, review_count: 1, next_review: '2026-07-20T10:00:00.000Z' },
      { completed: false, review_count: 2, next_review: '2026-07-12T10:00:00.000Z', review_stage: '7d' },
    ]);

    expect(consolidated).toMatchObject({
      completed: false,
      next_review: '2026-07-12T10:00:00.000Z',
      review_count: 2,
      review_stage: '7d',
    });
  });
});
