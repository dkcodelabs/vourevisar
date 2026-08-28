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

  return allowed
    .sort((left, right) => {
      if (mode === "flashcards_due") {
        return (left.dueAt ?? "").localeCompare(right.dueAt ?? "");
      }

      const leftSeen = attemptedItemIds.has(left.id) ? 1 : 0;
      const rightSeen = attemptedItemIds.has(right.id) ? 1 : 0;
      if (leftSeen !== rightSeen) return leftSeen - rightSeen;
      return right.createdAt.localeCompare(left.createdAt);
    })
    .slice(0, quantity);
}
