import type { Subject, Topic } from '@/types';

export type EditalProgressSummary = {
  completedTopics: number;
  hasProgress: boolean;
  reviewCount: number;
  reviewingTopics: number;
  scheduledReviewTopics: number;
  startedTopics: number;
  topicCount: number;
};

const getTopicStudySignals = (topic: Topic) => {
  const reviewCount = Number(topic.review_count ?? topic.reviewCount ?? 0);
  const completed = topic.completed === true || topic.is_completed === true;
  const hasReviewStage = Boolean(topic.review_stage || topic.reviewStage);
  const hasScheduledReview = Boolean(topic.next_review || topic.nextReview);
  const hasStudyDate = Boolean(topic.first_studied_at || topic.firstStudiedAt || topic.last_reviewed_at || topic.lastReviewedAt);
  const hasProgress = completed || reviewCount > 0 || hasReviewStage || hasScheduledReview || hasStudyDate;

  return {
    completed,
    hasProgress,
    hasScheduledReview: hasScheduledReview && !completed,
    reviewCount,
    reviewing: reviewCount > 0 && !completed,
  };
};

export const buildEditalProgressSummary = (subjects: Subject[]): EditalProgressSummary => {
  let topicCount = 0;
  let startedTopics = 0;
  let completedTopics = 0;
  let reviewCount = 0;
  let reviewingTopics = 0;
  let scheduledReviewTopics = 0;

  subjects.forEach(subject => {
    (subject.topics || []).forEach(topic => {
      const signals = getTopicStudySignals(topic);
      topicCount += 1;
      if (signals.hasProgress) startedTopics += 1;
      if (signals.completed) completedTopics += 1;
      if (signals.reviewing) reviewingTopics += 1;
      if (signals.hasScheduledReview) scheduledReviewTopics += 1;
      reviewCount += signals.reviewCount;
    });
  });

  return {
    completedTopics,
    hasProgress: startedTopics > 0 || completedTopics > 0 || reviewCount > 0 || reviewingTopics > 0 || scheduledReviewTopics > 0,
    reviewCount,
    reviewingTopics,
    scheduledReviewTopics,
    startedTopics,
    topicCount,
  };
};
