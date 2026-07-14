import type { MentorTrendLabel } from '@/types/mentor';

export type TrustedReviewTrendLabel = Extract<MentorTrendLabel, 'Melhorando' | 'Piorando'>;
export type StoredReviewTrendLabel = MentorTrendLabel | 'Sem histórico suficiente';

export interface ReviewDifficultyHistoryRow {
  difficulty_numeric: number | null;
}

export interface CalculatedReviewTrend {
  trendDelta: number | null;
  trendLabel: StoredReviewTrendLabel;
}

export interface ReviewTrendHistoryRow {
  topic_id: string;
  trend_label: string | null;
  trend_delta: number | null;
  reviewed_at: string;
}

const isTrustedReviewTrend = (
  label: string | null,
  delta: number | null,
): label is TrustedReviewTrendLabel => {
  if (typeof delta !== 'number' || !Number.isFinite(delta)) return false;
  if (label === 'Melhorando') return delta <= -0.5;
  if (label === 'Piorando') return delta >= 0.5;
  return false;
};

export const calculateReviewTrendFromDifficultyHistory = (
  currentDifficulty: number,
  pastReviews: ReviewDifficultyHistoryRow[] | null | undefined,
): CalculatedReviewTrend => {
  if (!pastReviews || pastReviews.length < 2) {
    return {
      trendDelta: null,
      trendLabel: 'Sem histórico suficiente',
    };
  }

  const numericDifficulties = pastReviews
    .map(review => review.difficulty_numeric)
    .filter((difficulty): difficulty is number =>
      typeof difficulty === 'number' && Number.isFinite(difficulty),
    );

  if (numericDifficulties.length < 2) {
    return {
      trendDelta: null,
      trendLabel: 'Sem histórico suficiente',
    };
  }

  const pastAverage = numericDifficulties.reduce((sum, difficulty) => sum + difficulty, 0) / numericDifficulties.length;
  const trendDelta = currentDifficulty - pastAverage;

  if (trendDelta >= 0.5) {
    return { trendDelta, trendLabel: 'Piorando' };
  }

  if (trendDelta <= -0.5) {
    return { trendDelta, trendLabel: 'Melhorando' };
  }

  return { trendDelta, trendLabel: 'Estável' };
};

export const buildLatestTrustedReviewTrendByTopic = (
  rows: ReviewTrendHistoryRow[],
): Map<string, TrustedReviewTrendLabel> => {
  const sortedRows = [...rows].sort(
    (a, b) => new Date(b.reviewed_at).getTime() - new Date(a.reviewed_at).getTime(),
  );
  const trendByTopic = new Map<string, TrustedReviewTrendLabel>();

  for (const row of sortedRows) {
    if (trendByTopic.has(row.topic_id)) continue;
    if (!isTrustedReviewTrend(row.trend_label, row.trend_delta)) continue;
    trendByTopic.set(row.topic_id, row.trend_label);
  }

  return trendByTopic;
};
