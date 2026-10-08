import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PracticeGenerationDialog } from "@/features/practice/components/PracticeGenerationDialog";
const topic = {
  subjectName: "Direito Administrativo",
  name: "Atos administrativos",
};

describe("PracticeGenerationDialog", () => {
  it("mantém a geração em andamento visível sem oferecer saída concorrente", () => {
    const onOpenChange = vi.fn();
    render(<PracticeGenerationDialog open state="preparing" topic={topic} onOpenChange={onOpenChange} onRetry={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Seu material está sendo preparado" })).toBeInTheDocument();
    expect(screen.getByText(/você entra direto no treino/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /resolver questões/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /decidir depois/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /voltar ao treino/i })).not.toBeInTheDocument();
  });

  it("explica a falha sem prometer material que não existe", () => {
    const onRetry = vi.fn();
    render(<PracticeGenerationDialog open state="failed" topic={topic} onOpenChange={vi.fn()} onRetry={onRetry} />);

    expect(screen.getByRole("dialog", { name: "Não foi possível concluir o lote" })).toBeInTheDocument();
    expect(screen.getByText(/nenhum material novo ficou disponível/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar gerar novamente" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
