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
      reviewsPerDay: 17 / 5,
      totalDailyWorkload: 19 / 5,
      totalPlannedReviews: 17,
      unstartedTopics: 2,
      pendingReviews: 3,
      futureReviewsInWindow: 1,
    });
    expect(metrics.pace.totalDailyWorkload).toBeCloseTo(metrics.pace.newTopicsPerDay! + metrics.pace.reviewsPerDay!);
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

  it('calculates full workload projection across newly created, in-progress and completed topics', () => {
    const metrics = getStudyCycleMetrics({
      now,
      editais: [{ exam_date: '2026-06-23' }], // 20 days until exam
      subjects: [
        {
          id: 'subject-1',
          topics: [
            // 10 new topics -> 10 * 4 = 40 reviews
            ...Array.from({ length: 10 }, (_, i) => ({ id: `new-${i}` })),
            // 5 with review_count = 1 -> 5 * 3 = 15 reviews
            ...Array.from({ length: 5 }, (_, i) => ({ id: `r1-${i}`, first_studied_at: '2026-06-01T08:00:00-03:00', review_count: 1 })),
            // 5 with review_count = 2 -> 5 * 2 = 10 reviews
            ...Array.from({ length: 5 }, (_, i) => ({ id: `r2-${i}`, first_studied_at: '2026-06-01T08:00:00-03:00', review_count: 2 })),
            // 3 with review_count = 3 -> 3 * 1 = 3 reviews
            ...Array.from({ length: 3 }, (_, i) => ({ id: `r3-${i}`, first_studied_at: '2026-06-01T08:00:00-03:00', review_count: 3 })),
            // 2 completed -> 0 reviews
            { id: 'done-1', completed: true, review_count: 4, first_studied_at: '2026-05-01T08:00:00-03:00' },
            { id: 'done-2', is_completed: true, review_count: 5, first_studied_at: '2026-05-01T08:00:00-03:00' },
          ],
        },
      ],
    });

    // Total topics = 25
    // Unstarted = 10
    // Total planned reviews = 40 + 15 + 10 + 3 + 0 = 68 reviews
    // Days remaining = 20
    expect(metrics.pace.state).toBe('ready');
    expect(metrics.pace.unstartedTopics).toBe(10);
    expect(metrics.pace.totalPlannedReviews).toBe(68);
    expect(metrics.pace.daysRemaining).toBe(20);
    expect(metrics.pace.newTopicsPerDay).toBe(10 / 20); // 0.5/day
    expect(metrics.pace.reviewsPerDay).toBe(68 / 20); // 3.4/day
    expect(metrics.pace.totalDailyWorkload).toBe(78 / 20); // 3.9/day
    expect(metrics.pace.totalDailyWorkload).toBeCloseTo(metrics.pace.newTopicsPerDay! + metrics.pace.reviewsPerDay!);
  });

  it('returns exam_date_past when exam is today (0 days remaining)', () => {
    const examToday = getStudyCycleMetrics({
      now,
      hasActiveCycle: true,
      cycleExamDate: '2026-06-03',
      subjects: [{ id: 'subject-1', topics: [{ id: 'topic-1' }] }],
    });

    expect(examToday.pace).toMatchObject({
      state: 'exam_date_past',
      daysRemaining: 0,
      newTopicsPerDay: null,
      reviewsPerDay: null,
      totalDailyWorkload: null,
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
