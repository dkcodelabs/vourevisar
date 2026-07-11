export function isExternalTopicCompletionUpdate(
  newTopic: { completed?: boolean | null; review_stage?: string | null; review_count?: number | null },
  oldTopic?: { review_count?: number | null } | null,
) {
  const isCompletedNow = Boolean(newTopic.completed) || newTopic.review_stage === 'Concluído';
  const hasReliablePreviousReviewCount = typeof oldTopic?.review_count === 'number';
  const hasAdvanced = hasReliablePreviousReviewCount
    ? (newTopic.review_count ?? 0) > oldTopic.review_count!
    : false;

  return isCompletedNow || hasAdvanced;
}
