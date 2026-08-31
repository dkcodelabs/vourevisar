import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PracticeGenerationDialog } from "@/features/practice/components/PracticeGenerationDialog";
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
  dueFlashcardCount: 0,
  latestPackageCreatedAt: "2026-08-28T12:00:00.000Z",
  isGenerating: false,
  hasReadyPackage: true,
};

describe("PracticeGenerationDialog", () => {
  it("confirma o lote pronto e deixa o aluno escolher o formato", () => {
    const onQuestions = vi.fn();
    const onFlashcards = vi.fn();
    render(<PracticeGenerationDialog open state="ready" topic={topic} onOpenChange={vi.fn()} onPracticeQuestions={onQuestions} onPracticeFlashcards={onFlashcards} onChooseAnotherTopic={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Material pronto para praticar" })).toBeInTheDocument();
    expect(screen.getByText("Direito Administrativo")).toBeInTheDocument();
    expect(screen.getByText("Atos administrativos")).toBeInTheDocument();
    expect(screen.getByText("6 questões")).toBeInTheDocument();
    expect(screen.getByText("4 flashcards")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resolver questões agora" }));
    fireEvent.click(screen.getByRole("button", { name: "Praticar flashcards" }));
    expect(onQuestions).toHaveBeenCalledOnce();
    expect(onFlashcards).toHaveBeenCalledOnce();
  });

  it("mantém a geração em andamento visível e permite decidir depois", () => {
    const onOpenChange = vi.fn();
    render(<PracticeGenerationDialog open state="preparing" topic={{ ...topic, hasReadyPackage: false, isGenerating: true, questionCount: 0, flashcardCount: 0 }} onOpenChange={onOpenChange} onPracticeQuestions={vi.fn()} onPracticeFlashcards={vi.fn()} onChooseAnotherTopic={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Preparando material" })).toBeInTheDocument();
    expect(screen.getByText(/lote será salvo em seu material/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /resolver questões/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Decidir depois" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("explica a falha sem prometer material que não existe", () => {
    render(<PracticeGenerationDialog open state="failed" topic={{ ...topic, hasReadyPackage: false, questionCount: 0, flashcardCount: 0 }} onOpenChange={vi.fn()} onPracticeQuestions={vi.fn()} onPracticeFlashcards={vi.fn()} onChooseAnotherTopic={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Não foi possível concluir o lote" })).toBeInTheDocument();
    expect(screen.getByText(/nenhum material novo ficou disponível/i)).toBeInTheDocument();
  });
});
