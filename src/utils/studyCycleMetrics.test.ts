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
            {
              id: 'topic-5',
              first_studied_at: '2026-06-02T08:00:00-03:00',
              review_count: 1,
              next_review: '2026-06-05T09:00:00-03:00',
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
    expect(metrics.pace).toMatchObject({
      state: 'ready',
      daysRemaining: 5,
      newTopicsPerDay: 2 / 5,
      reviewsPerDay: 3 / 5,
      unstartedTopics: 2,
      pendingReviews: 3,
      futureReviewsInWindow: 1,
    });
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

  it('returns an honest pace state when the cycle exam date is missing or past', () => {
    const missingDate = getStudyCycleMetrics({
      now,
      hasActiveCycle: true,
      subjects: [{ id: 'subject-1', topics: [{ id: 'topic-1' }] }],
    });

    expect(missingDate.pace).toMatchObject({
      state: 'missing_exam_date',
      daysRemaining: null,
      newTopicsPerDay: null,
      reviewsPerDay: null,
    });

    const pastDate = getStudyCycleMetrics({
      now,
      hasActiveCycle: true,
      cycleExamDate: '2026-06-01',
      subjects: [{ id: 'subject-1', topics: [{ id: 'topic-1' }] }],
    });

    expect(pastDate.pace).toMatchObject({
      state: 'exam_date_past',
      daysRemaining: -2,
      newTopicsPerDay: null,
      reviewsPerDay: null,
    });
  });

  it('uses the cycle exam date as the authoritative pace horizon when it exists', () => {
    const metrics = getStudyCycleMetrics({
      now,
      hasActiveCycle: true,
      cycleExamDate: '2026-06-20',
      editais: [{ exam_date: '2026-06-08' }],
      subjects: [{ id: 'subject-1', topics: [{ id: 'topic-1' }, { id: 'topic-2' }] }],
    });

    expect(metrics.daysUntilExam).toBe(17);
    expect(metrics.pace).toMatchObject({
      state: 'ready',
      daysRemaining: 17,
      newTopicsPerDay: 2 / 17,
    });
  });

  it('adds recent first-contact pace without inventing a forecast when history is weak', () => {
    const insufficient = getStudyCycleMetrics({
      now,
      cycleStart: '2026-06-01T08:00:00-03:00',
      subjects: [
        {
          id: 'subject-1',
          topics: [
            { id: 'topic-1', first_studied_at: '2026-06-03T08:00:00-03:00' },
            { id: 'topic-2' },
            { id: 'topic-3' },
          ],
        },
      ],
    });

    expect(insufficient.pace.recentFirstContact).toMatchObject({
      state: 'insufficient_data',
      topicsStarted: 1,
      topicsPerDay: null,
      projectedDaysToFirstContact: null,
    });

    const active = getStudyCycleMetrics({
      now,
      cycleStart: '2026-05-25T08:00:00-03:00',
      firstContactStudyDurationsMinutes: [35, 45, 40, 0, -5],
      subjects: [
        {
          id: 'subject-1',
          topics: [
            { id: 'topic-1', first_studied_at: '2026-06-01T08:00:00-03:00' },
            { id: 'topic-2', first_studied_at: '2026-06-02T08:00:00-03:00' },
            { id: 'topic-3', first_studied_at: '2026-06-03T08:00:00-03:00' },
            { id: 'topic-4' },
            { id: 'topic-5' },
            { id: 'topic-6' },
          ],
        },
      ],
    });

    expect(active.pace.recentFirstContact).toMatchObject({
      state: 'ready',
      topicsStarted: 3,
      topicsPerDay: 3 / 7,
      projectedDaysToFirstContact: 7,
      averageStudyMinutes: 40,
    });
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
