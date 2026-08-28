import {
  SRS_THRESHOLDS,
  type LearningStatus,
} from '@/utils/calculateNextReview';

export function determineLearningStatus(
  stability: number,
  interval: number,
  reviewCount: number,
): LearningStatus {
  if (reviewCount < SRS_THRESHOLDS.MIN_CONSISTENCY || stability < SRS_THRESHOLDS.STABILITY_LOW) {
    return 'Aprendendo';
  }

  if (
    stability >= SRS_THRESHOLDS.STABILITY_MID &&
    interval >= SRS_THRESHOLDS.INTERVAL_LONG &&
    reviewCount >= SRS_THRESHOLDS.MIN_CONSISTENCY
  ) {
    return 'Dominando';
  }

  return 'Fixando';
}
