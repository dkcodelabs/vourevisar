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

Deno.test("manual practice never silently reuses an exhausted item pool", () => {
  const items = selectPracticeItems({
    mode: "questions",
    quantity: 2,
    candidates,
    attemptedItemIds: new Set(["question-seen", "question-new"]),
  });

  if (items.length !== 0) {
    throw new Error("Itens já praticados devem abrir o estado de lote concluído, não uma repetição silenciosa.");
  }
});

Deno.test("mixed practice alternates questions and flashcards while both exist", () => {
  const items = selectPracticeItems({
    mode: "quick",
    format: "mixed",
    quantity: 4,
    candidates: [
      { id: "question-newest", itemType: "multiple_choice", topicId: "topic-a", createdAt: "2026-08-04T00:00:00Z" },
      { id: "flashcard-newest", itemType: "flashcard", topicId: "topic-a", createdAt: "2026-08-03T00:00:00Z" },
      { id: "question-old", itemType: "true_false", topicId: "topic-a", createdAt: "2026-08-02T00:00:00Z" },
      { id: "flashcard-old", itemType: "flashcard", topicId: "topic-a", createdAt: "2026-08-01T00:00:00Z" },
    ],
    attemptedItemIds: new Set(),
  });

  if (items.map((item) => item.itemType).join(",") !== "multiple_choice,flashcard,true_false,flashcard") {
    throw new Error("O formato misto deve alternar questões e flashcards preservando a ordem interna de cada tipo.");
  }
});

Deno.test("mixed practice keeps the available type when the other pool is exhausted", () => {
  const items = selectPracticeItems({
    mode: "quick",
    format: "mixed",
    quantity: 3,
    candidates: [
      { id: "question-newest", itemType: "multiple_choice", topicId: "topic-a", createdAt: "2026-08-03T00:00:00Z" },
      { id: "question-old", itemType: "true_false", topicId: "topic-a", createdAt: "2026-08-02T00:00:00Z" },
      { id: "flashcard", itemType: "flashcard", topicId: "topic-a", createdAt: "2026-08-01T00:00:00Z" },
    ],
    attemptedItemIds: new Set(),
  });

  if (items.length !== 3 || items[1]?.itemType !== "flashcard") {
    throw new Error("A seleção mista deve completar a quantidade usando o tipo ainda disponível.");
  }
});
