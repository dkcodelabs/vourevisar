import { describe, expect, it } from 'vitest';
import { getStudyCycleMetrics } from './studyCycleMetrics';

const now = new Date('2026-06-03T10:00:00-03:00');

describe('studyCycleMetrics', () => {
  it('calculates daily new topic and review goals from real dates', () => {
    const metrics = getStudyCycleMetrics({
      now,
      cycleStart: '2026-06-01T08:00:00-03:00',
      reviewsDoneToday: 1,
      editais: [{ exam_date: '2026-06-08' }],
      subjects: [
        {
          id: 'subject-1',
          topics: [
            {
              id: 'topic-1',
              first_studied_at: '2026-06-03T08:00:00-03:00',
              review_count: 1,
              next_review: '2026-06-03T09:00:00-03:00',
            },
            {
              id: 'topic-2',
              first_studied_at: '2026-06-01T08:00:00-03:00',
              review_count: 1,
              next_review: '2026-06-02T09:00:00-03:00',
            },
            {
              id: 'topic-3',
              review_count: 0,
            },
            {
              id: 'topic-4',
              review_count: 0,
            },
          ],
        },
      ],
    });

    expect(metrics.topicsStartedToday).toBe(1);
    expect(metrics.overdueReviews).toBe(1);
    expect(metrics.dueTodayReviews).toBe(1);
    expect(metrics.dailyReviewGoal).toBe(2);
    expect(metrics.reviewDeficitToday).toBe(1);
    expect(metrics.dailyNewTopicsGoal).toBe(1);
    expect(metrics.newTopicDeficitToday).toBe(0);
    expect(metrics.daysUntilExam).toBe(5);
  });

  it('estimates first-contact closing time from current cycle pace', () => {
    const metrics = getStudyCycleMetrics({
      now,
      cycleStart: '2026-06-01T08:00:00-03:00',
      subjects: [
        {
          id: 'subject-1',
          topics: [
            { id: 'topic-1', first_studied_at: '2026-06-01T08:00:00-03:00' },
            { id: 'topic-2', first_studied_at: '2026-06-02T08:00:00-03:00' },
            { id: 'topic-3' },
            { id: 'topic-4' },
          ],
        },
      ],
    });

    expect(metrics.topicsStartedInCycle).toBe(2);
    expect(metrics.topicsPerDayInCycle).toBeCloseTo(2 / 3);
    expect(metrics.estimatedDaysToFirstContact).toBe(3);
  });

  it('counts important unstarted topics by incidence or subject weight', () => {
    const metrics = getStudyCycleMetrics({
      now,
      subjects: [
        {
          id: 'weighted',
          exam_weight_percentage: 20,
          topics: [{ id: 'topic-1' }],
        },
        {
          id: 'incidence',
          topics: [{ id: 'topic-2', total_volume: 10 }],
        },
        {
          id: 'started',
          exam_weight_percentage: 30,
          topics: [{ id: 'topic-3', first_studied_at: '2026-06-03T08:00:00-03:00' }],
        },
      ],
    });

    expect(metrics.importantUnstartedTopics).toBe(2);
  });

  it('excludes hidden topics from cycle totals and pending counts', () => {
    const metrics = getStudyCycleMetrics({
      now,
      subjects: [
        {
          id: 'subject-1',
          topics: [
            { id: 'visible', review_count: 0 },
            { id: 'hidden', review_count: 0, is_hidden: true },
            { id: 'inactive', review_count: 0, is_active: false },
          ],
        },
      ],
    });

    expect(metrics.totalTopics).toBe(1);
    expect(metrics.unstartedTopics).toBe(1);
  });

  it('uses maturity gates based on cycle history and usage', () => {
    expect(getStudyCycleMetrics({ subjects: [], now }).maturity).toBe('cold_start');
    expect(getStudyCycleMetrics({
      subjects: [{ id: 'subject-1', topics: [{ id: 'topic-1', first_studied_at: '2026-06-03T08:00:00-03:00' }] }],
      now,
    }).maturity).toBe('started');
    expect(getStudyCycleMetrics({
      subjects: [{ id: 'subject-1', topics: [{ id: 'topic-1', first_studied_at: '2026-06-01T08:00:00-03:00' }] }],
      hasCycleHistory: true,
      now,
    }).maturity).toBe('historical');
  });
});
