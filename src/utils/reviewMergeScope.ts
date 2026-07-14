import type { SubjectMerge, TopicMerge } from '@/types/merges';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';
import { buildTopicEquivalenceGroups } from '@/utils/topicEquivalenceGraph';

export type ReviewScopeTopic = {
  id: string;
  name: string;
  subject_id: string;
  edital_id?: string | null;
  completed?: boolean | null;
  review_count?: number | null;
  next_review?: string | null;
  last_reviewed_at?: string | null;
  first_studied_at?: string | null;
  memory_stability?: number | null;
  current_interval?: number | null;
  source_topic_ids?: string[];
  source_edital_ids?: string[];
};

type ReviewTopicGroup = {
  ids: string[];
  displayName: string;
  sourceEditalIds?: string[];
};

type ReviewTopicMergeInput = Pick<TopicMerge, 'primary_topic_id' | 'merged_topic_ids' | 'display_name'> & {
  source_edital_ids?: string[] | null;
};

const unique = <T,>(items: T[]): T[] => [...new Set(items)];

export function expandReviewSubjectScope(
  cycleSubjectIds: string[],
  subjectMerges: Pick<SubjectMerge, 'primary_subject_id' | 'merged_subject_ids'>[],
  unificationMap?: CycleUnificationMap | null,
): string[] {
  const scopedIds = new Set(cycleSubjectIds);

  for (const merge of subjectMerges) {
    const mergeSubjectIds = [merge.primary_subject_id, ...(merge.merged_subject_ids || [])].filter(Boolean);
    if (!mergeSubjectIds.some(id => scopedIds.has(id))) continue;
    mergeSubjectIds.forEach(id => scopedIds.add(id));
  }

  for (const unified of unificationMap?.unifiedSubjects || []) {
    if (!unified.originalSubjectIds.some(id => scopedIds.has(id))) continue;
    unified.originalSubjectIds.forEach(id => scopedIds.add(id));
  }

  return [...scopedIds];
}

export function buildReviewTopicMergesFromUnificationMap(
  unificationMap?: CycleUnificationMap | null,
  _topics: ReviewScopeTopic[] = [],
): ReviewTopicMergeInput[] {
  return buildReviewTopicGroupsFromUnificationMap(unificationMap).map(group => {
    const [primaryTopicId, ...mergedTopicIds] = group.ids;
    return {
      primary_topic_id: primaryTopicId,
      merged_topic_ids: mergedTopicIds,
      display_name: group.displayName,
      source_edital_ids: group.sourceEditalIds || [],
    };
  });
}

function buildReviewTopicGroupsFromUnificationMap(
  unificationMap?: CycleUnificationMap | null,
): ReviewTopicGroup[] {
  return buildTopicEquivalenceGroups({ unificationMap }).map(group => ({
    ids: group.ids,
    displayName: group.displayName || 'Tópico unificado',
    sourceEditalIds: (unificationMap?.unifiedSubjects || [])
      .flatMap(subject => subject.topicMappings || [])
      .find(mapping => mapping.originalTopicIds.some(id => group.ids.includes(id)))
      ?.sourceEditalIds || [],
  }));
}

export function dedupeMergedReviewTopics<T extends ReviewScopeTopic>(
  topics: T[],
  topicMerges: ReviewTopicMergeInput[],
): T[] {
  const topicById = new Map(topics.map(topic => [topic.id, topic]));
  const consumedIds = new Set<string>();
  const mergedTopics: T[] = [];

  for (const merge of topicMerges) {
    const mergeTopicIds = [merge.primary_topic_id, ...(merge.merged_topic_ids || [])].filter(Boolean);
    const availableTopics = mergeTopicIds
      .map(id => topicById.get(id))
      .filter((topic): topic is T => Boolean(topic) && !consumedIds.has(topic.id));

    if (availableTopics.length === 0) continue;

    const representative = chooseRepresentativeReviewTopic(availableTopics);
    const sourceEditalIds = unique([
      ...(merge.source_edital_ids || []),
      ...availableTopics.flatMap(topic => topic.source_edital_ids || []),
      ...availableTopics.map(topic => topic.edital_id).filter((id): id is string => Boolean(id)),
    ]);
    mergedTopics.push({
      ...representative,
      id: merge.primary_topic_id,
      name: merge.display_name || representative.name,
      source_topic_ids: unique([
        ...mergeTopicIds,
        ...availableTopics.flatMap(topic => topic.source_topic_ids || []),
      ]),
      source_edital_ids: sourceEditalIds,
    });
    mergeTopicIds.forEach(id => consumedIds.add(id));
  }

  const standaloneTopics = topics
    .filter(topic => !consumedIds.has(topic.id))
    .map(topic => ({
      ...topic,
      source_topic_ids: topic.source_topic_ids || [topic.id],
      source_edital_ids: topic.source_edital_ids || (topic.edital_id ? [topic.edital_id] : []),
    }));
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
