import { describe, expect, it } from 'vitest';
import { getReviewScheduleBucket, isPendingReviewBucket } from './reviewSchedule';

// Keep the fixture away from local-midnight boundaries: the classifier uses the
// learner's local calendar day, while the CI runner executes in UTC.
const now = new Date('2026-08-29T12:00:00Z');

describe('reviewSchedule', () => {
  it('keeps overdue, today, future and completed topics mutually exclusive', () => {
    expect(getReviewScheduleBucket({ review_count: 1, next_review: '2026-08-28T12:00:00Z' }, now)).toBe('overdue');
    expect(getReviewScheduleBucket({ review_count: 1, next_review: '2026-08-29T13:00:00Z' }, now)).toBe('today');
    expect(getReviewScheduleBucket({ review_count: 1, next_review: '2026-08-30T12:00:00Z' }, now)).toBe('future');
    expect(getReviewScheduleBucket({ review_count: 5, next_review: '2026-08-29T08:00:00Z' }, now)).toBe('completed');
  });

  it('keeps an unscheduled started topic out of the future bucket', () => {
    expect(getReviewScheduleBucket({ review_count: 1, next_review: null }, now)).toBe('unscheduled');
    expect(isPendingReviewBucket('future')).toBe(false);
    expect(isPendingReviewBucket('today')).toBe(true);
  });
});
