import { describe, expect, it } from 'vitest';

import { calculateNextReview } from './calculateNextReview';

const today = new Date(2026, 5, 22, 12, 0, 0);

function metrics(reviewCount: number, overrides: Partial<{
  memoryStability: number;
  currentInterval: number;
}> = {}) {
  return {
    memoryStability: overrides.memoryStability ?? Math.max(1, reviewCount * 7),
    currentInterval: overrides.currentInterval ?? Math.max(0, reviewCount * 7),
    reviewCount,
  };
}

describe('calculateNextReview', () => {
  it('agenda a primeira revisão em até 24 horas para qualquer dificuldade', () => {
    for (const difficulty of [1, 2, 3]) {
      const result = calculateNextReview({
        today,
        difficulty,
        metrics: metrics(0, { memoryStability: 0, currentInterval: 0 }),
      });

      expect(result.newInterval).toBe(1);
      expect(result.nextReviewDate).toEqual(new Date(2026, 5, 23));
      expect(result.isProgramCompleted).toBe(false);
    }
  });

  it.each([
    { reviewCount: 1, difficulty: 3, expected: 5 },
    { reviewCount: 1, difficulty: 2, expected: 7 },
    { reviewCount: 1, difficulty: 1, expected: 10 },
    { reviewCount: 2, difficulty: 3, expected: 15 },
    { reviewCount: 2, difficulty: 2, expected: 22 },
    { reviewCount: 2, difficulty: 1, expected: 30 },
    { reviewCount: 3, difficulty: 3, expected: 60 },
    { reviewCount: 3, difficulty: 2, expected: 75 },
    { reviewCount: 3, difficulty: 1, expected: 90 },
  ])(
    'usa $expected dias após o contato $reviewCount com dificuldade $difficulty',
    ({ reviewCount, difficulty, expected }) => {
      const result = calculateNextReview({
        today,
        difficulty,
        metrics: metrics(reviewCount, {
          memoryStability: reviewCount * 7,
          currentInterval: reviewCount * 7,
        }),
      });

      expect(result.newInterval).toBe(expected);
      expect(result.isProgramCompleted).toBe(false);
    },
  );

  it('encerra o programa depois da quarta revisão sem inventar próxima data', () => {
    const result = calculateNextReview({
      today,
      difficulty: 3,
      metrics: metrics(4),
    });

    expect(result.isProgramCompleted).toBe(true);
    expect(result.nextReviewDate).toBeNull();
    expect(result.newInterval).toBe(0);
  });

  it('mantém ajustes adaptativos dentro da janela da etapa', () => {
    const worseningTrend = calculateNextReview({
      today,
      difficulty: 2,
      trendDelta: 1,
      overdueDays: 8,
      metrics: metrics(2, { memoryStability: 5, currentInterval: 15 }),
    });
    const improvingTrend = calculateNextReview({
      today,
      difficulty: 2,
      trendDelta: -1,
      metrics: metrics(2, { memoryStability: 30, currentInterval: 15 }),
    });

    expect(worseningTrend.newInterval).toBeGreaterThanOrEqual(15);
    expect(worseningTrend.newInterval).toBeLessThan(22);
    expect(improvingTrend.newInterval).toBeGreaterThan(22);
    expect(improvingTrend.newInterval).toBeLessThanOrEqual(30);
  });

  it('não comprime a agenda quando o edital não tem data de prova', () => {
    const result = calculateNextReview({
      today,
      difficulty: 1,
      examDate: null,
      metrics: metrics(3),
    });

    expect(result.newInterval).toBe(90);
    expect(result.wasCompressed).toBe(false);
  });

  it('comprime uma revisão para antes da semana da prova', () => {
    const result = calculateNextReview({
      today,
      difficulty: 1,
      examDate: new Date(2026, 7, 20),
      metrics: metrics(3),
    });

    expect(result.wasCompressed).toBe(true);
    expect(result.nextReviewDate).toEqual(new Date(2026, 7, 13));
    expect(result.newInterval).toBe(90);
    expect(result.scheduledInterval).toBe(52);
  });
});
