import { isReviewProgramCompleted } from '@/utils/reviewStage';

export type ReviewScheduleBucket =
  | 'overdue'
  | 'today'
  | 'future'
  | 'completed'
  | 'unscheduled'
  | 'unstarted';

export type ReviewScheduleTopic = {
  completed?: boolean | null;
  is_completed?: boolean | null;
  reviewCount?: number | null;
  review_count?: number | null;
  reviewStage?: string | null;
  review_stage?: string | null;
  firstStudiedAt?: Date | string | null;
  first_studied_at?: Date | string | null;
  nextReview?: Date | string | null;
  next_review?: Date | string | null;
};

const startOfLocalDay = (date: Date) => {
  const localDay = new Date(date);
  localDay.setHours(0, 0, 0, 0);
  return localDay;
};

const toValidDate = (value?: Date | string | null) => {
  if (!value) return null;

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const dateOnly = new Date(year, month - 1, day);
    return Number.isFinite(dateOnly.getTime()) ? dateOnly : null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

const hasMeaningfulReviewStage = (stage?: string | null) => {
  const normalized = String(stage || '').trim().toLowerCase();
  return Boolean(normalized) && !['0', 'novo', 'não iniciado', 'nao iniciado', 'null', 'undefined'].includes(normalized);
};

export const isReviewScheduleStarted = (topic: ReviewScheduleTopic) =>
  Boolean(topic.first_studied_at) ||
  Boolean(topic.firstStudiedAt) ||
  (topic.review_count || 0) > 0 ||
  (topic.reviewCount || 0) > 0 ||
  hasMeaningfulReviewStage(topic.review_stage) ||
  hasMeaningfulReviewStage(topic.reviewStage) ||
  isReviewProgramCompleted(topic);

/** Canonical classification for every review queue and counter. */
export const getReviewScheduleBucket = (
  topic: ReviewScheduleTopic,
  now: Date = new Date(),
): ReviewScheduleBucket => {
  if (isReviewProgramCompleted(topic)) return 'completed';
  if (!isReviewScheduleStarted(topic)) return 'unstarted';

  const dueDate = toValidDate(topic.next_review || topic.nextReview);
  if (!dueDate) return 'unscheduled';

  const dueDay = startOfLocalDay(dueDate).getTime();
  const today = startOfLocalDay(now).getTime();

  if (dueDay < today) return 'overdue';
  if (dueDay === today) return 'today';
  return 'future';
};

export const isPendingReviewBucket = (bucket: ReviewScheduleBucket) =>
  bucket === 'overdue' || bucket === 'today';
