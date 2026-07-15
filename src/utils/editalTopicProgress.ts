import type { Subject, Topic } from '@/types';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';
import { PROGRAMMED_REVIEW_COUNT } from '@/utils/calculateNextReview';
import { getProgrammedReviewsCompleted, isReviewProgramCompleted } from '@/utils/reviewStage';
import { buildTopicEquivalenceGroups, getExplicitEquivalentTopicIds } from '@/utils/topicEquivalenceGraph';

export interface EditalTopicCycleProgress {
  reviewsCompleted: number;
  isCompleted: boolean;
  isStarted: boolean;
  isConsolidatedFromEquivalent: boolean;
}

export interface EditalTopicProgressBadge {
  label: string;
  tone: 'success' | 'primary' | 'muted';
}

const getTopicContactCount = (topic: Topic): number =>
  Math.max(topic.reviewCount ?? 0, topic.review_count ?? 0);

const isTopicStarted = (topic: Topic): boolean =>
  getTopicContactCount(topic) > 0 ||
  Boolean(topic.firstStudiedAt || topic.first_studied_at);

const flattenTopics = (subjects: Subject[]): Topic[] =>
  subjects.flatMap(subject => subject.topics ?? []);

export const getEquivalentTopicIds = (
  topic: Topic,
  _allSubjects: Subject[],
  unificationMap: CycleUnificationMap | null,
): string[] => {
  return getExplicitEquivalentTopicIds(topic.id, buildTopicEquivalenceGroups({ unificationMap }));
};

export function getEditalTopicCycleProgress(
  topic: Topic,
  allSubjects: Subject[],
  unificationMap: CycleUnificationMap | null,
): EditalTopicCycleProgress {
  const equivalentTopicIds = new Set(getEquivalentTopicIds(topic, allSubjects, unificationMap));
  const equivalentTopics = flattenTopics(allSubjects).filter(candidate => equivalentTopicIds.has(candidate.id));
  const candidates = equivalentTopics.length > 0 ? equivalentTopics : [topic];

  const isCompleted = candidates.some(isReviewProgramCompleted);
  const reviewsCompleted = Math.max(
    ...candidates.map(candidate =>
      getProgrammedReviewsCompleted(getTopicContactCount(candidate), isReviewProgramCompleted(candidate)),
    ),
  );

  return {
    reviewsCompleted,
    isCompleted,
    isStarted: candidates.some(isTopicStarted),
    isConsolidatedFromEquivalent: candidates.some(candidate => candidate.id !== topic.id && (
      isReviewProgramCompleted(candidate) ||
      getTopicContactCount(candidate) > getTopicContactCount(topic)
    )),
  };
}

export function getEditalTopicProgressBadge(
  topic: Topic,
  allSubjects: Subject[],
  unificationMap: CycleUnificationMap | null,
): EditalTopicProgressBadge | null {
  const progress = getEditalTopicCycleProgress(topic, allSubjects, unificationMap);

  if (progress.isCompleted) {
    return {
      label: progress.isConsolidatedFromEquivalent
        ? `${PROGRAMMED_REVIEW_COUNT}/${PROGRAMMED_REVIEW_COUNT} revisões no ciclo`
        : `${PROGRAMMED_REVIEW_COUNT}/${PROGRAMMED_REVIEW_COUNT} revisões`,
      tone: 'success',
    };
  }

  if (progress.reviewsCompleted > 0) {
    return {
      label: `${progress.reviewsCompleted}/${PROGRAMMED_REVIEW_COUNT} revisões`,
      tone: 'primary',
    };
  }

  if (progress.isStarted) {
    return {
      label: 'Primeiro contato feito',
      tone: 'muted',
    };
  }

  return {
    label: `0/${PROGRAMMED_REVIEW_COUNT} revisões`,
    tone: 'muted',
  };
}

export function getEditalSubjectCycleProgress(
  subject: Subject,
  allSubjects: Subject[],
  unificationMap: CycleUnificationMap | null,
): number {
  if (!subject.topics?.length) return 0;

  const completedTopics = subject.topics.filter(topic =>
    getEditalTopicCycleProgress(topic, allSubjects, unificationMap).isCompleted,
  ).length;

  return Math.round((completedTopics / subject.topics.length) * 100);
}
