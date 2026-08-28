import { selectPracticeItems } from "./practiceSessionSelection.ts";

const candidates = [
  { id: "flashcard-late", itemType: "flashcard" as const, topicId: "topic-a", createdAt: "2026-08-01T00:00:00Z", dueAt: "2026-08-10T00:00:00Z" },
  { id: "flashcard-first", itemType: "flashcard" as const, topicId: "topic-b", createdAt: "2026-08-02T00:00:00Z", dueAt: "2026-08-01T00:00:00Z" },
  { id: "question-seen", itemType: "true_false" as const, topicId: "topic-a", createdAt: "2026-08-03T00:00:00Z" },
  { id: "question-new", itemType: "multiple_choice" as const, topicId: "topic-a", createdAt: "2026-08-01T00:00:00Z" },
];

Deno.test("due flashcards span topics and honor the due order", () => {
  const items = selectPracticeItems({
    mode: "flashcards_due",
    quantity: 2,
    candidates,
    attemptedItemIds: new Set(),
  });

  if (items.map((item) => item.id).join(",") !== "flashcard-first,flashcard-late") {
    throw new Error("Cartões vencidos não foram ordenados pela data de vencimento.");
  }
});

Deno.test("questions prefer unseen eligible items", () => {
  const items = selectPracticeItems({
    mode: "questions",
    quantity: 2,
    candidates,
    attemptedItemIds: new Set(["question-seen"]),
  });

  if (items[0]?.id !== "question-new") {
    throw new Error("A seleção não priorizou a questão ainda não respondida.");
  }
});

