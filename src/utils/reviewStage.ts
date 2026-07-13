import { COMPLETION_CONTACT_COUNT } from '@/utils/calculateNextReview';

export function getReviewStage(contactCount: number): string {
  if (contactCount >= COMPLETION_CONTACT_COUNT) return 'Concluído';
  if (contactCount <= 1) return 'Primeiro Contato';
  return `Revisão ${contactCount - 1}`;
}

export function getProgrammedReviewsCompleted(
  contactCount: number,
  completed: boolean,
): number {
  if (completed || contactCount >= COMPLETION_CONTACT_COUNT) {
    return COMPLETION_CONTACT_COUNT - 1;
  }
  return Math.min(
    COMPLETION_CONTACT_COUNT - 1,
    Math.max(0, contactCount - 1),
  );
}

export function isReviewProgramCompleted(topic: {
  completed?: boolean | null;
  is_completed?: boolean | null;
  reviewCount?: number | null;
  review_count?: number | null;
  reviewStage?: string | null;
  review_stage?: string | null;
  learningStatus?: string | null;
}): boolean {
  const stage = topic.reviewStage ?? topic.review_stage;
  const contactCount = Math.max(topic.reviewCount ?? 0, topic.review_count ?? 0);

  return topic.completed === true ||
    topic.is_completed === true ||
    stage === 'Concluído' ||
    contactCount >= COMPLETION_CONTACT_COUNT;
}
