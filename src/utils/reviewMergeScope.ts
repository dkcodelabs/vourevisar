import type { SubjectMerge, TopicMerge } from '@/types/merges';

export type ReviewScopeTopic = {
  id: string;
  name: string;
  subject_id: string;
  completed?: boolean | null;
  review_count?: number | null;
  next_review?: string | null;
  last_reviewed_at?: string | null;
  first_studied_at?: string | null;
  memory_stability?: number | null;
  current_interval?: number | null;
};

export function expandReviewSubjectScope(
  cycleSubjectIds: string[],
  subjectMerges: Pick<SubjectMerge, 'primary_subject_id' | 'merged_subject_ids'>[],
): string[] {
  const scopedIds = new Set(cycleSubjectIds);

  for (const merge of subjectMerges) {
    const mergeSubjectIds = [merge.primary_subject_id, ...(merge.merged_subject_ids || [])].filter(Boolean);
    if (!mergeSubjectIds.some(id => scopedIds.has(id))) continue;
    mergeSubjectIds.forEach(id => scopedIds.add(id));
  }

  return [...scopedIds];
}

export function dedupeMergedReviewTopics<T extends ReviewScopeTopic>(
  topics: T[],
  topicMerges: Pick<TopicMerge, 'primary_topic_id' | 'merged_topic_ids' | 'display_name'>[],
): T[] {
  const topicById = new Map(topics.map(topic => [topic.id, topic]));
  const consumedIds = new Set<string>();
  const mergedTopics: T[] = [];

  for (const merge of topicMerges) {
    const mergeTopicIds = [merge.primary_topic_id, ...(merge.merged_topic_ids || [])].filter(Boolean);
    const availableTopics = mergeTopicIds
      .map(id => topicById.get(id))
      .filter((topic): topic is T => Boolean(topic));

    if (availableTopics.length === 0) continue;

    const representative = chooseRepresentativeReviewTopic(availableTopics);
    mergedTopics.push({
      ...representative,
      id: merge.primary_topic_id,
      name: merge.display_name || representative.name,
    });
    mergeTopicIds.forEach(id => consumedIds.add(id));
  }

  const standaloneTopics = topics.filter(topic => !consumedIds.has(topic.id));
  return [...mergedTopics, ...standaloneTopics];
}

function chooseRepresentativeReviewTopic<T extends ReviewScopeTopic>(topics: T[]): T {
  return [...topics].sort((a, b) => {
    if (Boolean(a.completed) !== Boolean(b.completed)) return a.completed ? -1 : 1;

    const reviewCountDelta = (b.review_count || 0) - (a.review_count || 0);
    if (reviewCountDelta !== 0) return reviewCountDelta;

    const aNextReview = a.next_review ? new Date(a.next_review).getTime() : Number.POSITIVE_INFINITY;
    const bNextReview = b.next_review ? new Date(b.next_review).getTime() : Number.POSITIVE_INFINITY;
    if (aNextReview !== bNextReview) return aNextReview - bNextReview;

    const aLastReview = a.last_reviewed_at ? new Date(a.last_reviewed_at).getTime() : 0;
    const bLastReview = b.last_reviewed_at ? new Date(b.last_reviewed_at).getTime() : 0;
    return bLastReview - aLastReview;
  })[0];
}
