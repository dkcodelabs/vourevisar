export type PracticePerformanceAttempt = {
  topic_id: string | null;
  attempt_kind: "objective_answer" | "flashcard_recall";
  result: "correct" | "incorrect" | "skipped" | "recalled" | "effortful" | "forgotten";
};

export type RecentPracticePerformance = {
  windowDays: 7;
  questions: {
    correct: number;
    incorrect: number;
    skipped: number;
    answered: number;
    accuracyPercentage: number | null;
  };
  flashcards: {
    recalled: number;
    effortful: number;
    forgotten: number;
    reviewed: number;
  };
};

export const emptyRecentPracticePerformance = (): RecentPracticePerformance => ({
  windowDays: 7,
  questions: { correct: 0, incorrect: 0, skipped: 0, answered: 0, accuracyPercentage: null },
  flashcards: { recalled: 0, effortful: 0, forgotten: 0, reviewed: 0 },
});

export const summarizeRecentPracticePerformance = (
  attempts: PracticePerformanceAttempt[],
  activeTopicIds: Set<string>,
): RecentPracticePerformance => {
  const summary = emptyRecentPracticePerformance();

  for (const attempt of attempts) {
    if (!attempt.topic_id || !activeTopicIds.has(attempt.topic_id)) continue;

    if (attempt.attempt_kind === "objective_answer") {
      if (attempt.result === "correct") summary.questions.correct += 1;
      if (attempt.result === "incorrect") summary.questions.incorrect += 1;
      if (attempt.result === "skipped") summary.questions.skipped += 1;
      continue;
    }

    if (attempt.attempt_kind === "flashcard_recall") {
      if (attempt.result === "recalled") summary.flashcards.recalled += 1;
      if (attempt.result === "effortful") summary.flashcards.effortful += 1;
      if (attempt.result === "forgotten") summary.flashcards.forgotten += 1;
    }
  }

  summary.questions.answered = summary.questions.correct + summary.questions.incorrect;
  summary.questions.accuracyPercentage = summary.questions.answered
    ? Math.round((summary.questions.correct / summary.questions.answered) * 100)
    : null;
  summary.flashcards.reviewed = summary.flashcards.recalled
    + summary.flashcards.effortful
    + summary.flashcards.forgotten;

  return summary;
};
