import {
  buildPracticeSessionSchema,
  practiceFeedbackSchema,
  revealPracticeItemSchema,
  submitPracticeAttemptSchema,
} from "./practiceContracts.ts";

const topicId = "11111111-1111-1111-1111-111111111111";
const sessionId = "22222222-2222-2222-2222-222222222222";
const itemId = "33333333-3333-3333-3333-333333333333";
const idempotencyKey = "44444444-4444-4444-4444-444444444444";

Deno.test("questions allow a global manual session with an idempotency key", () => {
  const result = buildPracticeSessionSchema.safeParse({
    mode: "questions",
    quantity: 3,
    idempotencyKey,
  });

  if (!result.success) throw result.error;
});

Deno.test("due flashcards may span topics", () => {
  const result = buildPracticeSessionSchema.safeParse({
    mode: "flashcards_due",
    quantity: 5,
    idempotencyKey,
  });

  if (!result.success) throw result.error;
});

Deno.test("manual quick sessions support up to ten items", () => {
  const result = buildPracticeSessionSchema.safeParse({
    mode: "quick",
    topicId,
    quantity: 4,
    idempotencyKey,
  });

  if (!result.success) throw result.error;
});

Deno.test("flashcard sessions support the approved six-card batch", () => {
  const result = buildPracticeSessionSchema.safeParse({
    mode: "flashcards_due",
    quantity: 6,
    idempotencyKey: crypto.randomUUID(),
  });

  if (!result.success) throw result.error;
});

Deno.test("objective attempts never accept an unstructured answer", () => {
  const result = submitPracticeAttemptSchema.safeParse({
    sessionId,
    itemId,
    clientAttemptId: idempotencyKey,
    answer: { kind: "objective_answer" },
  });

  if (result.success) throw new Error("A resposta sem opção deveria ser inválida.");
});

Deno.test("negative feedback requires a structured reason", () => {
  const result = practiceFeedbackSchema.safeParse({
    itemId,
    rating: -1,
  });

  if (result.success) throw new Error("O motivo deveria ser obrigatório.");
});

Deno.test("flashcard reveal only accepts session and item identifiers", () => {
  const result = revealPracticeItemSchema.safeParse({ sessionId, itemId });

  if (!result.success) throw result.error;
});
