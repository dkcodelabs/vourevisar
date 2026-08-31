import { recommendPracticeTopic, recommendStudyAction, type PracticeOverviewTopic } from "./practiceOverview.ts";

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

Deno.test("study action prioritizes the oldest overdue review", () => {
  const result = recommendStudyAction([
    topic({ id: "today", nextReview: "2026-08-27T14:00:00.000Z" }),
    topic({ id: "older", nextReview: "2026-08-24T14:00:00.000Z" }),
    topic({ id: "newer", nextReview: "2026-08-26T14:00:00.000Z" }),
  ], new Date("2026-08-27T12:00:00.000Z"));

  if (result.topic?.id !== "older" || result.reason !== "overdue_review") {
    throw new Error("A revisão mais atrasada precisa ser a recomendação.");
  }
});

Deno.test("study action keeps a review due today ahead of the generic cycle", () => {
  const result = recommendStudyAction([
    topic({ id: "hard", difficultyLevel: 5 }),
    topic({ id: "today", nextReview: "2026-08-27T14:00:00.000Z", difficultyLevel: 1 }),
  ], new Date("2026-08-27T12:00:00.000Z"));

  if (result.topic?.id !== "today" || result.reason !== "review_due_today") {
    throw new Error("Revisão do dia precisa encaminhar o aluno antes do ciclo genérico.");
  }
});

Deno.test("practice overview prioriza menor qualidade recente entre tópicos com falhas", () => {
  const result = recommendPracticeTopic([
    topic({ id: "unstable", recentFailureCount: 3, recentAttemptCount: 4, recentCorrectCount: 1 }),
    topic({ id: "better", recentFailureCount: 2, recentAttemptCount: 8, recentCorrectCount: 6 }),
  ]);

  if (result.topic?.id !== "unstable" || result.reason !== "recent_failure") {
    throw new Error("A qualidade recente precisa pesar mais que a quantidade bruta de erros.");
  }
});

Deno.test("practice overview does not invent a practice recommendation from available material", () => {
  const result = recommendPracticeTopic([
    topic({ id: "b", subjectName: "Processo Penal", name: "Inquérito" }),
    topic({ id: "a", subjectName: "Direito Administrativo", name: "Atos" }),
  ]);

  if (result.topic !== null || result.reason !== null) {
    throw new Error("Material disponível sem sinal de estudo não pode decidir a prática do aluno.");
  }
});

Deno.test("practice overview suggests a return only after an auditable consistency gap", () => {
  const result = recommendPracticeTopic([
    topic({ id: "inactive", lastReviewedAt: "2026-08-20T12:00:00.000Z", practiceConsistencyGap: true }),
    topic({ id: "neutral", lastReviewedAt: "2026-08-25T12:00:00.000Z" }),
  ]);

  if (result.topic?.id !== "inactive" || result.reason !== "practice_inactive") {
    throw new Error("A retomada precisa depender do sinal explícito de consistência, não só de material disponível.");
  }
});
