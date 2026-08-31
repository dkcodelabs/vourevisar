import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PracticeBuilderDialog } from "@/features/practice/components/PracticeBuilderDialog";

vi.mock("@/features/practice/hooks/usePracticeTopicOptions", () => ({
  usePracticeTopics: () => ({
    data: [{ id: "topic-1", name: "Atos administrativos" }],
    isLoading: false,
  }),
}));

describe("PracticeBuilderDialog", () => {
  it("não apresenta reforço ou pendência como filtros manuais sem uma recomendação concreta", () => {
    render(
      <PracticeBuilderDialog
        open
        mode="manual"
        userId="student-1"
        subjects={[{ id: "subject-1", name: "Direito Administrativo" }]}
        onOpenChange={vi.fn()}
        onStart={vi.fn()}
        onGenerate={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /Reforçar falhas/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Revisar pendências/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Por matéria/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Por tópico/ })).toBeInTheDocument();
  });

  it("mantém o reforço preso ao tópico e formato da sessão que o originou", () => {
    const onStart = vi.fn();
    render(
      <PracticeBuilderDialog
        open
        mode="manual"
        userId="student-1"
        subjects={[{ id: "subject-1", name: "Direito Administrativo" }]}
        initialGoal="reinforce"
        initialSubjectId="subject-1"
        initialTopicId="topic-1"
        initialSubjectName="Direito Administrativo"
        initialTopicName="Atos administrativos"
        initialFormat="flashcards"
        onOpenChange={vi.fn()}
        onStart={onStart}
        onGenerate={vi.fn()}
      />,
    );

    expect(screen.getByText("Foco deste reforço")).toBeInTheDocument();
    expect(screen.getByText("Direito Administrativo")).toBeInTheDocument();
    expect(screen.getByText("Atos administrativos")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Começar treino" }));

    expect(onStart).toHaveBeenCalledWith({
      mode: "quick",
      format: "flashcards",
      quantity: 3,
      topicId: "topic-1",
    });
  });

  it("permite voltar da geração para o material disponível", () => {
    const onBackToManual = vi.fn();
    render(
      <PracticeBuilderDialog
        open
        mode="deepening"
        userId="student-1"
        subjects={[{ id: "subject-1", name: "Direito Administrativo" }]}
        onOpenChange={vi.fn()}
        onStart={vi.fn()}
        onGenerate={vi.fn()}
        onBackToManual={onBackToManual}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Voltar para material disponível" }));
    expect(onBackToManual).toHaveBeenCalledOnce();
  });
});
