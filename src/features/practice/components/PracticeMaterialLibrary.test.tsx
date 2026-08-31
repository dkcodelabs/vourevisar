import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PracticeMaterialLibrary } from "@/features/practice/components/PracticeMaterialLibrary";
import type { PracticeMaterialTopic } from "@/features/practice/services/practiceService";

const topic: PracticeMaterialTopic = {
  id: "topic-1",
  subjectId: "subject-1",
  subjectName: "Direito Administrativo",
  name: "Atos administrativos",
  nextReview: null,
  difficultyLevel: null,
  lastReviewedAt: null,
  questionCount: 6,
  flashcardCount: 4,
  dueFlashcardCount: 2,
  latestPackageCreatedAt: "2026-08-28T12:00:00.000Z",
  isGenerating: false,
  hasReadyPackage: true,
};

describe("PracticeMaterialLibrary", () => {
  it("exibe o inventário privado por tópico e abre a ação compatível", () => {
    const onQuestions = vi.fn();
    const onFlashcards = vi.fn();
    const onDueFlashcards = vi.fn();
    render(<PracticeMaterialLibrary topics={[topic]} onPracticeQuestions={onQuestions} onPracticeFlashcards={onFlashcards} onReviewDueFlashcards={onDueFlashcards} />);

    expect(screen.getByRole("heading", { name: "Continue de onde parou" })).toBeInTheDocument();
    expect(screen.getByText("6 questões")).toBeInTheDocument();
    expect(screen.getByText("4 flashcards")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Questões" }));
    fireEvent.click(screen.getByRole("button", { name: "Revisar 2 flashcards" }));
    expect(onQuestions).toHaveBeenCalledWith(topic);
    expect(onDueFlashcards).toHaveBeenCalledWith(topic);
    expect(onFlashcards).not.toHaveBeenCalled();
  });

  it("não cria uma biblioteca vazia", () => {
    const { container } = render(<PracticeMaterialLibrary topics={[]} onPracticeQuestions={vi.fn()} onPracticeFlashcards={vi.fn()} onReviewDueFlashcards={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
