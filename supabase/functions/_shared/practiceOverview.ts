export type PracticeOverviewTopic = {
  id: string;
  subjectId: string;
  subjectName: string;
  name: string;
  nextReview: string | null;
  difficultyLevel: number | null;
  lastReviewedAt: string | null;
  recentFailureCount?: number;
  recentAttemptCount?: number;
  recentCorrectCount?: number;
  practiceConsistencyGap?: boolean;
  subjectWeight?: number | null;
};

export type PracticeRecommendationReason =
  | "recent_failure"
  | "recorded_difficulty"
  | "practice_inactive";

export type PracticeStudyActionReason = "overdue_review" | "review_due_today" | "continue_cycle";

const startOfToday = (now: Date) =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

const isDueToday = (value: string, now: Date) => {
  const dueAt = new Date(value).getTime();
  const today = startOfToday(now);
  return dueAt >= today && dueAt < today + 24 * 60 * 60 * 1000;
};

const byName = (left: PracticeOverviewTopic, right: PracticeOverviewTopic) =>
  `${left.subjectName}\u0000${left.name}`.localeCompare(`${right.subjectName}\u0000${right.name}`, "pt-BR");

export const recommendPracticeTopic = (
  topics: readonly PracticeOverviewTopic[],
  now = new Date(),
): { topic: PracticeOverviewTopic | null; reason: PracticeRecommendationReason | null } => {
  const recentFailure = topics
    .filter((topic) => (topic.recentFailureCount ?? 0) > 0)
    .sort((left, right) =>
      ((right.recentFailureCount ?? 0) / Math.max(right.recentAttemptCount ?? 0, 1))
        - ((left.recentFailureCount ?? 0) / Math.max(left.recentAttemptCount ?? 0, 1))
      || (right.recentFailureCount ?? 0) - (left.recentFailureCount ?? 0)
      || (right.subjectWeight ?? 0) - (left.subjectWeight ?? 0)
      || byName(left, right));
  if (recentFailure[0]) return { topic: recentFailure[0], reason: "recent_failure" };

  const difficult = topics
    .filter((topic) => (topic.difficultyLevel ?? 0) >= 4)
    .sort((left, right) =>
      (right.difficultyLevel ?? 0) - (left.difficultyLevel ?? 0)
      || (right.subjectWeight ?? 0) - (left.subjectWeight ?? 0)
      || byName(left, right));
  if (difficult[0]) return { topic: difficult[0], reason: "recorded_difficulty" };

  const inactive = topics
    .filter((topic) => topic.practiceConsistencyGap === true)
    .sort((left, right) =>
      new Date(right.lastReviewedAt ?? 0).getTime() - new Date(left.lastReviewedAt ?? 0).getTime()
      || (right.subjectWeight ?? 0) - (left.subjectWeight ?? 0)
      || byName(left, right));
  if (inactive[0]) return { topic: inactive[0], reason: "practice_inactive" };

  return { topic: null, reason: null };
};

export const recommendStudyAction = (
  topics: readonly PracticeOverviewTopic[],
  now = new Date(),
): { topic: PracticeOverviewTopic | null; reason: PracticeStudyActionReason } => {
  const overdue = topics
    .filter((topic) => topic.nextReview && new Date(topic.nextReview).getTime() < now.getTime())
    .sort((left, right) => new Date(left.nextReview ?? 0).getTime() - new Date(right.nextReview ?? 0).getTime());
  if (overdue[0]) return { topic: overdue[0], reason: "overdue_review" };

  const dueToday = topics
    .filter((topic) => topic.nextReview && isDueToday(topic.nextReview, now))
    .sort((left, right) => new Date(left.nextReview ?? 0).getTime() - new Date(right.nextReview ?? 0).getTime());
  if (dueToday[0]) return { topic: dueToday[0], reason: "review_due_today" };

  return { topic: null, reason: "continue_cycle" };
};
