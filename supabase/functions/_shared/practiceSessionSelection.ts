import type { BuildPracticeSessionInput } from "./practiceContracts.ts";

export type SelectablePracticeItem = {
  id: string;
  itemType: "flashcard" | "multiple_choice" | "true_false";
  topicId: string;
  createdAt: string;
  dueAt?: string;
};

type SelectionInput = Pick<BuildPracticeSessionInput, "mode" | "quantity" | "format"> & {
  candidates: SelectablePracticeItem[];
  attemptedItemIds: ReadonlySet<string>;
};

const objectiveTypes = new Set<SelectablePracticeItem["itemType"]>([
  "multiple_choice",
  "true_false",
]);

function selectMixedItems(
  pool: SelectablePracticeItem[],
  quantity: number,
): SelectablePracticeItem[] {
  const objective = pool.filter((item) => objectiveTypes.has(item.itemType));
  const flashcards = pool.filter((item) => item.itemType === "flashcard");
  if (!objective.length || !flashcards.length) return pool.slice(0, quantity);

  const selected: SelectablePracticeItem[] = [];
  let objectiveIndex = 0;
  let flashcardIndex = 0;
  let nextType: "objective" | "flashcard" = objective[0] === pool[0]
    ? "objective"
    : "flashcard";

  while (selected.length < quantity && (objectiveIndex < objective.length || flashcardIndex < flashcards.length)) {
    if (nextType === "objective" && objectiveIndex < objective.length) {
      selected.push(objective[objectiveIndex]);
      objectiveIndex += 1;
      nextType = "flashcard";
      continue;
    }

    if (nextType === "flashcard" && flashcardIndex < flashcards.length) {
      selected.push(flashcards[flashcardIndex]);
      flashcardIndex += 1;
      nextType = "objective";
      continue;
    }

    nextType = objectiveIndex < objective.length ? "objective" : "flashcard";
  }

  return selected;
}

export function selectPracticeItems({
  mode,
  format,
  quantity,
  candidates,
  attemptedItemIds,
}: SelectionInput): SelectablePracticeItem[] {
  const allowed = candidates.filter((item) => {
    if (mode === "flashcards_due") return item.itemType === "flashcard" && Boolean(item.dueAt);
    if (mode === "questions") return objectiveTypes.has(item.itemType);
    if (format === "flashcards") return item.itemType === "flashcard";
    if (format === "questions") return objectiveTypes.has(item.itemType);
    return true;
  });

  const unseen = allowed.filter((item) => !attemptedItemIds.has(item.id));
  const pool = mode === "flashcards_due" ? allowed : unseen;

  const sortedPool = pool
    .sort((left, right) => {
      if (mode === "flashcards_due") {
        return (left.dueAt ?? "").localeCompare(right.dueAt ?? "");
      }

      const leftSeen = attemptedItemIds.has(left.id) ? 1 : 0;
      const rightSeen = attemptedItemIds.has(right.id) ? 1 : 0;
      if (leftSeen !== rightSeen) return leftSeen - rightSeen;
      return right.createdAt.localeCompare(left.createdAt);
    });

  return format === "mixed" && mode !== "flashcards_due"
    ? selectMixedItems(sortedPool, quantity)
    : sortedPool.slice(0, quantity);
}
