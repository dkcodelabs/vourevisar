import { recommendPracticeTopic, type PracticeOverviewTopic } from "./practiceOverview.ts";

const topic = (overrides: Partial<PracticeOverviewTopic>): PracticeOverviewTopic => ({
  id: "topic-1",
  subjectId: "subject-1",
  subjectName: "Direito Administrativo",
  name: "Atos administrativos",
  nextReview: null,
  difficultyLevel: null,
  lastReviewedAt: null,
  ...overrides,
});

Deno.test("practice overview prioritizes the oldest overdue review", () => {
  const result = recommendPracticeTopic([
    topic({ id: "today", nextReview: "2026-08-27T14:00:00.000Z" }),
    topic({ id: "older", nextReview: "2026-08-24T14:00:00.000Z" }),
    topic({ id: "newer", nextReview: "2026-08-26T14:00:00.000Z" }),
  ], new Date("2026-08-27T12:00:00.000Z"));

  if (result.topic?.id !== "older" || result.reason !== "overdue_review") {
    throw new Error("A revisão mais atrasada precisa ser a recomendação.");
  }
});

Deno.test("practice overview uses difficulty only after due reviews", () => {
  const result = recommendPracticeTopic([
    topic({ id: "hard", difficultyLevel: 5 }),
    topic({ id: "today", nextReview: "2026-08-27T14:00:00.000Z", difficultyLevel: 1 }),
  ], new Date("2026-08-27T12:00:00.000Z"));

  if (result.topic?.id !== "today" || result.reason !== "review_due_today") {
    throw new Error("Revisão do dia precisa vir antes da dificuldade registrada.");
  }
});

Deno.test("practice overview has a deterministic fallback for a new student", () => {
  const result = recommendPracticeTopic([
    topic({ id: "b", subjectName: "Processo Penal", name: "Inquérito" }),
    topic({ id: "a", subjectName: "Direito Administrativo", name: "Atos" }),
  ]);

  if (result.topic?.id !== "a" || result.reason !== "available_topic") {
    throw new Error("O fallback precisa ser estável quando ainda não há sinais de estudo.");
  }
});
