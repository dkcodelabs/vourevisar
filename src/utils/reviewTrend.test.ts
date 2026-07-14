import { describe, expect, it } from 'vitest';

import {
  buildLatestTrustedReviewTrendByTopic,
  calculateReviewTrendFromDifficultyHistory,
} from './reviewTrend';

describe('calculateReviewTrendFromDifficultyHistory', () => {
  it('returns insufficient history before two numeric reviews', () => {
    expect(calculateReviewTrendFromDifficultyHistory(2, [
      { difficulty_numeric: 1 },
      { difficulty_numeric: null },
    ])).toEqual({
      trendDelta: null,
      trendLabel: 'Sem histórico suficiente',
    });
  });

  it('labels the current review as improving when difficulty drops enough', () => {
    expect(calculateReviewTrendFromDifficultyHistory(1, [
      { difficulty_numeric: 2 },
      { difficulty_numeric: 3 },
    ])).toEqual({
      trendDelta: -1.5,
      trendLabel: 'Melhorando',
    });
  });

  it('labels the current review as worsening when difficulty rises enough', () => {
    expect(calculateReviewTrendFromDifficultyHistory(3, [
      { difficulty_numeric: 1 },
      { difficulty_numeric: 2 },
    ])).toEqual({
      trendDelta: 1.5,
      trendLabel: 'Piorando',
    });
  });

  it('keeps small variation as stable', () => {
    const result = calculateReviewTrendFromDifficultyHistory(2, [
      { difficulty_numeric: 2 },
      { difficulty_numeric: 2 },
      { difficulty_numeric: 3 },
    ]);

    expect(result.trendLabel).toBe('Estável');
    expect(result.trendDelta).toBeCloseTo(-1 / 3);
  });
});

describe('buildLatestTrustedReviewTrendByTopic', () => {
  it('uses only review-history trends with compatible deltas', () => {
    const trendByTopic = buildLatestTrustedReviewTrendByTopic([
      {
        topic_id: 'crase',
        trend_label: 'Melhorando',
        trend_delta: -0.8,
        reviewed_at: '2026-07-13T10:00:00.000Z',
      },
      {
        topic_id: 'penal',
        trend_label: 'Piorando',
        trend_delta: 0.6,
        reviewed_at: '2026-07-13T10:00:00.000Z',
      },
      {
        topic_id: 'constitucional',
        trend_label: 'Melhorando',
        trend_delta: 0.8,
        reviewed_at: '2026-07-13T10:00:00.000Z',
      },
    ]);

    expect(trendByTopic.get('crase')).toBe('Melhorando');
    expect(trendByTopic.get('penal')).toBe('Piorando');
    expect(trendByTopic.has('constitucional')).toBe(false);
  });

  it('keeps the latest trusted trend per topic', () => {
    const trendByTopic = buildLatestTrustedReviewTrendByTopic([
      {
        topic_id: 'crase',
        trend_label: 'Melhorando',
        trend_delta: -0.8,
        reviewed_at: '2026-07-12T10:00:00.000Z',
      },
      {
        topic_id: 'crase',
        trend_label: 'Piorando',
        trend_delta: 0.7,
        reviewed_at: '2026-07-13T10:00:00.000Z',
      },
    ]);

    expect(trendByTopic.get('crase')).toBe('Piorando');
  });

  it('does not show neutral or insufficient history as a visible trend', () => {
    const trendByTopic = buildLatestTrustedReviewTrendByTopic([
      {
        topic_id: 'crase',
        trend_label: 'Estável',
        trend_delta: 0,
        reviewed_at: '2026-07-13T10:00:00.000Z',
      },
      {
        topic_id: 'penal',
        trend_label: 'Sem histórico suficiente',
        trend_delta: null,
        reviewed_at: '2026-07-13T10:00:00.000Z',
      },
    ]);

    expect(trendByTopic.size).toBe(0);
  });
});
