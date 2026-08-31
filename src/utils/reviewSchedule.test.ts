import { describe, expect, it } from 'vitest';
import { getReviewScheduleBucket, isPendingReviewBucket } from './reviewSchedule';

const now = new Date('2026-08-29T10:00:00-03:00');

describe('reviewSchedule', () => {
  it('keeps overdue, today, future and completed topics mutually exclusive', () => {
    expect(getReviewScheduleBucket({ review_count: 1, next_review: '2026-08-28T12:00:00-03:00' }, now)).toBe('overdue');
    expect(getReviewScheduleBucket({ review_count: 1, next_review: '2026-08-29T23:00:00-03:00' }, now)).toBe('today');
    expect(getReviewScheduleBucket({ review_count: 1, next_review: '2026-08-30T08:00:00-03:00' }, now)).toBe('future');
    expect(getReviewScheduleBucket({ review_count: 5, next_review: '2026-08-29T08:00:00-03:00' }, now)).toBe('completed');
  });

  it('keeps an unscheduled started topic out of the future bucket', () => {
    expect(getReviewScheduleBucket({ review_count: 1, next_review: null }, now)).toBe('unscheduled');
    expect(isPendingReviewBucket('future')).toBe(false);
    expect(isPendingReviewBucket('today')).toBe(true);
  });
});
