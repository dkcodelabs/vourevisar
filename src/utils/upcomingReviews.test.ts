import { describe, expect, it } from 'vitest';
import { addDays, format, startOfDay } from 'date-fns';
import { buildUpcomingReviews, getUpcomingReviewsInsight } from './upcomingReviews';

describe('buildUpcomingReviews', () => {
  const now = new Date(2026, 8, 15, 10, 0, 0); // 2026-09-15 (Terça-feira)

  it('builds 7 days window starting from today with zero counts if empty', () => {
    const result = buildUpcomingReviews([], [], [], now);

    expect(result.days).toHaveLength(7);
    expect(result.days[0].dayLabel).toBe('Hoje');
    expect(result.days[0].isToday).toBe(true);
    expect(result.days[0].date).toBe('2026-09-15');
    expect(result.days[1].dayLabel).toBe('Amanhã');
    expect(result.days[1].isToday).toBe(false);
    expect(result.days[1].date).toBe('2026-09-16');

    expect(result.totalInWindow).toBe(0);
    expect(result.totalBeyondWindow).toBe(0);
    expect(result.peakDay).toBeNull();
  });

  it('accumulates today and overdue reviews on day 0', () => {
    const todayReviews = [{ id: '1' }, { id: '2' }];
    const overdueReviews = [{ id: '3' }];

    const result = buildUpcomingReviews(todayReviews, overdueReviews, [], now);

    expect(result.days[0].reviewCount).toBe(3);
    expect(result.days[0].overdueCount).toBe(1);
    expect(result.totalInWindow).toBe(3);
    expect(result.peakDay).toEqual({ dayLabel: 'Hoje', count: 3 });
  });

  it('distributes future reviews across the 7-day window and detects beyond window', () => {
    const today = startOfDay(now);
    const futureReviews = [
      { id: 'f1', nextReview: format(addDays(today, 1), 'yyyy-MM-dd') }, // Amanhã
      { id: 'f2', nextReview: format(addDays(today, 1), 'yyyy-MM-dd') }, // Amanhã
      { id: 'f3', nextReview: format(addDays(today, 3), 'yyyy-MM-dd') }, // D+3
      { id: 'f4', nextReview: format(addDays(today, 3), 'yyyy-MM-dd') },
      { id: 'f5', nextReview: format(addDays(today, 3), 'yyyy-MM-dd') },
      { id: 'f6', nextReview: format(addDays(today, 10), 'yyyy-MM-dd') }, // Beyond
      { id: 'f7', nextReview: format(addDays(today, 20), 'yyyy-MM-dd') }, // Beyond
    ];

    const result = buildUpcomingReviews([], [], futureReviews, now);

    expect(result.days[1].reviewCount).toBe(2); // Amanhã
    expect(result.days[3].reviewCount).toBe(3); // D+3
    expect(result.totalInWindow).toBe(5);
    expect(result.totalBeyondWindow).toBe(2);
    expect(result.peakDay).toEqual({ dayLabel: result.days[3].dayLabel, count: 3 });
  });

  it('provides appropriate insight messages based on load and peak', () => {
    // Empty
    const emptyResult = buildUpcomingReviews([], [], [], now);
    expect(getUpcomingReviewsInsight(emptyResult).tone).toBe('info');
    expect(getUpcomingReviewsInsight(emptyResult).message).toContain('Nenhuma revisão agendada');

    // Balanced
    const balancedResult = buildUpcomingReviews([{ id: '1' }], [], [{ id: '2', nextReview: format(addDays(now, 2), 'yyyy-MM-dd') }], now);
    expect(getUpcomingReviewsInsight(balancedResult).tone).toBe('success');
    expect(getUpcomingReviewsInsight(balancedResult).message).toContain('Carga equilibrada');

    // Heavy peak (>= 8)
    const heavyReviews = Array.from({ length: 12 }, (_, i) => ({
      id: `h${i}`,
      nextReview: format(addDays(now, 2), 'yyyy-MM-dd'),
    }));
    const peakResult = buildUpcomingReviews([], [], heavyReviews, now);
    const insight = getUpcomingReviewsInsight(peakResult);
    expect(insight.tone).toBe('warning');
    expect(insight.message).toContain('Pico previsto: 12 revisões');
  });
});
