import { supabase } from '@/integrations/supabase/client';

interface PendingTopicSchedule {
  id: string;
  last_reviewed_at: string | null;
  current_interval: number | null;
  next_review: string | null;
}

interface PendingReviewAdjustment {
  id: string;
  nextReview: string;
}

function parseDateOnlyLocal(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfLocalDay(value: Date): Date {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addLocalDays(value: Date, days: number): Date {
  const result = startOfLocalDay(value);
  result.setDate(result.getDate() + days);
  return result;
}

function localDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getOverdueDays(
  scheduledAt: string | null | undefined,
  referenceDate: Date = new Date(),
): number {
  if (!scheduledAt) return 0;
  const scheduledDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) return 0;

  const scheduledDay = startOfLocalDay(scheduledDate);
  const referenceDay = startOfLocalDay(referenceDate);
  const scheduledUtc = Date.UTC(
    scheduledDay.getFullYear(),
    scheduledDay.getMonth(),
    scheduledDay.getDate(),
  );
  const referenceUtc = Date.UTC(
    referenceDay.getFullYear(),
    referenceDay.getMonth(),
    referenceDay.getDate(),
  );

  return Math.max(0, Math.round((referenceUtc - scheduledUtc) / 86_400_000));
}

export function buildPendingReviewAdjustments(
  topics: PendingTopicSchedule[],
  examDateValue: string | null | undefined,
): PendingReviewAdjustment[] {
  const examDate = parseDateOnlyLocal(examDateValue);
  const examProtectionLimit = examDate ? addLocalDays(examDate, -7) : null;

  return topics.flatMap(topic => {
    const interval = Number(topic.current_interval || 0);
    if (!topic.last_reviewed_at || interval <= 0) return [];

    const lastReviewedAt = new Date(topic.last_reviewed_at);
    if (Number.isNaN(lastReviewedAt.getTime())) return [];

    const cognitiveDate = addLocalDays(lastReviewedAt, interval);
    const adjustedDate = examProtectionLimit && cognitiveDate > examProtectionLimit
      ? examProtectionLimit
      : cognitiveDate;
    const currentDate = topic.next_review ? new Date(topic.next_review) : null;

    if (currentDate && !Number.isNaN(currentDate.getTime())) {
      if (localDateKey(currentDate) === localDateKey(adjustedDate)) return [];
    }

    return [{ id: topic.id, nextReview: adjustedDate.toISOString() }];
  });
}

export async function fetchTopicExamDate(
  editalId: string | null | undefined,
  userId: string,
): Promise<Date | null> {
  if (!editalId) return null;

  const { data, error } = await supabase
    .from('user_editais')
    .select('exam_date')
    .eq('id', editalId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return parseDateOnlyLocal(data?.exam_date);
}

export async function recalculatePendingReviewsForEdital(params: {
  editalId: string;
  userId: string;
  examDate: string | null | undefined;
}): Promise<{ adjustedCount: number }> {
  const { editalId, userId, examDate } = params;
  const { data, error } = await supabase
    .from('topics')
    .select('id, last_reviewed_at, current_interval, next_review')
    .eq('edital_id', editalId)
    .eq('user_id', userId)
    .eq('completed', false)
    .gt('review_count', 0);

  if (error) throw error;

  const adjustments = buildPendingReviewAdjustments(
    (data || []) as PendingTopicSchedule[],
    examDate,
  );

  const batchSize = 20;
  for (let index = 0; index < adjustments.length; index += batchSize) {
    const batch = adjustments.slice(index, index + batchSize);
    const results = await Promise.all(batch.map(adjustment => (
      supabase
        .from('topics')
        .update({ next_review: adjustment.nextReview })
        .eq('id', adjustment.id)
        .eq('user_id', userId)
    )));

    const failed = results.find(result => result.error);
    if (failed?.error) throw failed.error;
  }

  return { adjustedCount: adjustments.length };
}
