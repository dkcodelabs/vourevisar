import type { MentorTrendLabel } from '@/types/mentor';

export type TrustedReviewTrendLabel = Extract<MentorTrendLabel, 'Melhorando' | 'Piorando'>;

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
