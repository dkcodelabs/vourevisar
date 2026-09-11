import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { summarizeRecentPracticePerformance } from "./practicePerformance.ts";

Deno.test("practice performance keeps question and flashcard semantics separate", () => {
  const summary = summarizeRecentPracticePerformance([
    { topic_id: "active", attempt_kind: "objective_answer", result: "correct" },
    { topic_id: "active", attempt_kind: "objective_answer", result: "incorrect" },
    { topic_id: "active", attempt_kind: "objective_answer", result: "skipped" },
    { topic_id: "active", attempt_kind: "flashcard_recall", result: "recalled" },
    { topic_id: "active", attempt_kind: "flashcard_recall", result: "effortful" },
    { topic_id: "active", attempt_kind: "flashcard_recall", result: "forgotten" },
    { topic_id: "outside", attempt_kind: "objective_answer", result: "correct" },
  ], new Set(["active"]));

  assertEquals(summary.questions, {
    correct: 1,
    incorrect: 1,
    skipped: 1,
    answered: 2,
    accuracyPercentage: 50,
  });
  assertEquals(summary.flashcards, { recalled: 1, effortful: 1, forgotten: 1, reviewed: 3 });
});

Deno.test("practice accuracy is absent when the student only skipped questions", () => {
  const summary = summarizeRecentPracticePerformance([
    { topic_id: "active", attempt_kind: "objective_answer", result: "skipped" },
  ], new Set(["active"]));

  assertEquals(summary.questions.accuracyPercentage, null);
  assertEquals(summary.questions.answered, 0);
});
