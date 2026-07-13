import type { Subject, Topic } from '@/types';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';
import { getEquivalentTopicIds } from '@/utils/editalTopicProgress';
import { isReviewProgramCompleted } from '@/utils/reviewStage';

export type TopicProgressRepairPatch = Pick<
  Partial<Topic>,
  | 'completed'
  | 'is_completed'
  | 'review_count'
  | 'reviewCount'
  | 'review_stage'
  | 'reviewStage'
  | 'next_review'
  | 'nextReview'
  | 'last_reviewed_at'
  | 'lastReviewedAt'
  | 'first_studied_at'
  | 'firstStudiedAt'
  | 'difficulty_level'
  | 'difficulty_set_at'
  | 'memory_stability'
  | 'current_interval'
>;

export interface TopicProgressRepairEntry {
  groupKey: string;
  sourceTopicId: string;
  targetTopicIds: string[];
  patch: TopicProgressRepairPatch;
}

const flattenTopics = (subjects: Subject[]): Topic[] =>
  subjects.flatMap(subject => subject.topics ?? []);

const getContactCount = (topic: Topic): number =>
  Math.max(topic.review_count ?? 0, topic.reviewCount ?? 0);

const getProgressScore = (topic: Topic): number => {
  const completionBonus = isReviewProgramCompleted(topic) ? 10_000 : 0;
  return completionBonus + getContactCount(topic);
};

const pickStrongestTopic = (topics: Topic[]): Topic =>
  [...topics].sort((a, b) => getProgressScore(b) - getProgressScore(a))[0];

const buildPatchFromTopic = (topic: Topic): TopicProgressRepairPatch => ({
  completed: topic.completed,
  is_completed: topic.is_completed,
  review_count: topic.review_count,
  reviewCount: topic.reviewCount,
  review_stage: topic.review_stage,
  reviewStage: topic.reviewStage,
  next_review: topic.next_review,
  nextReview: topic.nextReview,
  last_reviewed_at: topic.last_reviewed_at,
  lastReviewedAt: topic.lastReviewedAt,
  first_studied_at: topic.first_studied_at,
  firstStudiedAt: topic.firstStudiedAt,
  difficulty_level: topic.difficulty_level,
  difficulty_set_at: topic.difficulty_set_at,
  memory_stability: topic.memory_stability,
  current_interval: topic.current_interval,
});

const toDatabasePatch = (patch: TopicProgressRepairPatch): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries({
      completed: patch.completed,
      review_count: patch.review_count,
      review_stage: patch.review_stage,
      next_review: patch.next_review,
      last_reviewed_at: patch.last_reviewed_at,
      first_studied_at: patch.first_studied_at,
      difficulty_level: patch.difficulty_level,
      difficulty_set_at: patch.difficulty_set_at,
      memory_stability: patch.memory_stability,
      current_interval: patch.current_interval,
    }).filter(([, value]) => value !== undefined),
  );

const needsRepair = (topic: Topic, strongest: Topic): boolean =>
  getProgressScore(topic) < getProgressScore(strongest);

export function buildEditalTopicProgressRepairPlan(
  subjects: Subject[],
  unificationMap: CycleUnificationMap | null,
): TopicProgressRepairEntry[] {
  if (!unificationMap) return [];

  const topics = flattenTopics(subjects);
  const topicsById = new Map(topics.map(topic => [topic.id, topic]));
  const visitedGroupKeys = new Set<string>();

  return topics.flatMap(topic => {
    const equivalentIds = getEquivalentTopicIds(topic, subjects, unificationMap);
    const groupKey = equivalentIds.slice().sort().join('|');

    if (visitedGroupKeys.has(groupKey) || equivalentIds.length < 2) return [];
    visitedGroupKeys.add(groupKey);

    const equivalentTopics = equivalentIds
      .map(id => topicsById.get(id))
      .filter((candidate): candidate is Topic => Boolean(candidate));

    if (equivalentTopics.length < 2) return [];

    const strongest = pickStrongestTopic(equivalentTopics);
    const targetTopicIds = equivalentTopics
      .filter(candidate => candidate.id !== strongest.id && needsRepair(candidate, strongest))
      .map(candidate => candidate.id);

    if (targetTopicIds.length === 0) return [];

    return [{
      groupKey,
      sourceTopicId: strongest.id,
      targetTopicIds,
      patch: buildPatchFromTopic(strongest),
    }];
  });
}

export function toTopicProgressDatabasePatch(patch: TopicProgressRepairPatch): Record<string, unknown> {
  return toDatabasePatch(patch);
}

export function applyTopicProgressRepairPlan(
  subjects: Subject[],
  repairPlan: TopicProgressRepairEntry[],
): Subject[] {
  if (repairPlan.length === 0) return subjects;

  const patchByTopicId = new Map<string, TopicProgressRepairPatch>();
  repairPlan.forEach(entry => {
    entry.targetTopicIds.forEach(topicId => patchByTopicId.set(topicId, entry.patch));
  });

  return subjects.map(subject => ({
    ...subject,
    topics: subject.topics.map(topic => {
      const patch = patchByTopicId.get(topic.id);
      return patch ? { ...topic, ...patch } : topic;
    }),
  }));
}
