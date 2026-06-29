import { supabase } from '@/integrations/supabase/client';

type TopicProgressUpdate = Record<string, unknown>;
type TopicReviewHistoryInput = Record<string, unknown>;

const PROGRESS_FIELDS = new Set([
  'completed',
  'current_interval',
  'difficulty_level',
  'difficulty_set_at',
  'first_studied_at',
  'is_marked_for_review',
  'last_reviewed_at',
  'last_session_duration',
  'marked_for_review_at',
  'memory_stability',
  'next_review',
  'review_count',
  'review_stage',
]);

const HISTORY_FIELDS = new Set([
  'cycle_id',
  'difficulty_numeric',
  'edital_id',
  'interval_after_review',
  'memory_stability_after_review',
  'review_stage',
  'reviewed_at',
  'study_duration_minutes',
  'trend_delta',
  'trend_label',
]);

export function pickTopicProgressFields(updateData: TopicProgressUpdate): TopicProgressUpdate {
  return Object.fromEntries(
    Object.entries(updateData).filter(([key, value]) => PROGRESS_FIELDS.has(key) && value !== undefined),
  );
}

function pickTopicHistoryFields(historyData: TopicReviewHistoryInput | null | undefined): TopicReviewHistoryInput | null {
  if (!historyData) return null;

  const historyUpdate = Object.fromEntries(
    Object.entries(historyData).filter(([key, value]) => HISTORY_FIELDS.has(key) && value !== undefined),
  );

  return Object.keys(historyUpdate).length > 0 ? historyUpdate : null;
}

export function omitTopicProgressFields(updateData: TopicProgressUpdate): TopicProgressUpdate {
  return Object.fromEntries(
    Object.entries(updateData).filter(([key, value]) => !PROGRESS_FIELDS.has(key) && value !== undefined),
  );
}

export async function syncMergedTopicProgress({
  userId,
  topicId,
  updateData,
  historyData,
}: {
  userId: string;
  topicId: string;
  updateData: TopicProgressUpdate;
  historyData?: TopicReviewHistoryInput | null;
}): Promise<string[]> {
  const progressUpdate = pickTopicProgressFields(updateData);
  const historyUpdate = pickTopicHistoryFields(historyData);

  if (Object.keys(progressUpdate).length === 0) {
    return [];
  }

  const { data, error } = await supabase.rpc('sync_topic_merge_progress', {
    p_user_id: userId,
    p_topic_id: topicId,
    p_progress: progressUpdate,
    p_history: historyUpdate,
  });

  if (error) throw error;

  if (data && typeof data === 'object' && !Array.isArray(data) && 'synced_topic_ids' in data) {
    const ids = (data as { synced_topic_ids?: unknown }).synced_topic_ids;
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
  }

  return [];
}
