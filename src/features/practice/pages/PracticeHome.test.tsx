import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { PracticeOverview, PracticeSession } from "@/features/practice/services/practiceService";

const mocks = vi.hoisted(() => ({
  build: vi.fn(),
  generate: vi.fn(),
  reveal: vi.fn(),
  submit: vi.fn(),
  rate: vi.fn(),
  refetch: vi.fn(),
  overviewError: false,
  overviewLoading: false,
  overview: {
    scope: { status: "active", subjectIds: ["subject-1"], activeEditalCount: 1 },
    recommendedTopic: null,
    selectedTopic: null,
    materialTopics: [],
    flashcards: { dueCount: 0, dueTopicCount: 0, newCount: 0, newTopicCount: 0 },
    studyAction: { kind: "cycle", topic: null, reason: "continue_cycle" },
    dailyRecommendation: { kind: "clear", count: 0, topicCount: 0, reason: "clear", estimatedMinutes: 0 },
  } as PracticeOverview,
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "student-1" } }) }));
vi.mock("@/features/practice/hooks/usePracticeTopicOptions", () => ({
  usePracticeSubjects: () => ({ data: [{ id: "subject-1", name: "Direito Administrativo" }], isLoading: false }),
  usePracticeTopics: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/features/practice/hooks/usePracticeSessionActions", () => ({
  usePracticeSessionActions: () => ({
    buildSession: { isPending: false, mutateAsync: mocks.build },
    generatePackage: { isPending: false, mutateAsync: mocks.generate },
    revealItem: { mutateAsync: mocks.reveal },
    submitAttempt: { mutateAsync: mocks.submit },
    rateItem: { mutateAsync: mocks.rate },
  }),
}));
vi.mock("@/features/practice/hooks/usePracticeOverview", () => ({
  usePracticeOverview: () => ({
    data: mocks.overview,
    isLoading: mocks.overviewLoading,
    isFetching: false,
    isError: mocks.overviewError,
    refetch: mocks.refetch,
  }),
}));

import PracticeHome from "@/features/practice/pages/PracticeHome";

const questionSession: PracticeSession = {
  id: "session-question", mode: "questions", status: "active", topicId: "topic-1",
  items: [{
    id: "item-question", type: "true_false", prompt: "A revogação produz efeitos retroativos.",
    options: [{ id: "certo", label: "Certo" }, { id: "errado", label: "Errado" }],
    learningObjective: null, depth: "application", targetDifficulty: "intermediate", position: 1,
    servedReason: "unseen_practice_item",
  }],
};

const renderPage = () => render(<MemoryRouter initialEntries={["/treino"]}><PracticeHome /></MemoryRouter>);

const setDailyQuestion = () => {
  mocks.overview.dailyRecommendation = {
    kind: "questions", count: 3, topicCount: 1, reason: "recorded_difficulty", estimatedMinutes: 2,
    topic: {
      id: "topic-1", subjectId: "subject-1", subjectName: "Direito Administrativo", name: "Atos administrativos",
      nextReview: null, difficultyLevel: 3, lastReviewedAt: null, questionCount: 6, flashcardCount: 4,
    },
  };
};

const setDailyFlashcards = () => {
  mocks.overview.dailyRecommendation = {
    kind: "flashcards_due", count: 2, topicCount: 1, reason: "flashcards_due", estimatedMinutes: 2,
    topic: {
      id: "topic-1", subjectId: "subject-1", subjectName: "Direito Administrativo", name: "Atos administrativos",
      nextReview: null, difficultyLevel: 2, lastReviewedAt: null, questionCount: 6, flashcardCount: 4,
    },
  };
};

describe("PracticeHome", () => {
  it("não confunde erro de consulta com prática em dia", () => {
    mocks.overviewError = true;
    renderPage();

    expect(screen.getByRole("heading", { name: "Não foi possível carregar seu treino" })).toBeInTheDocument();
    expect(screen.getByText(/não vamos considerar sua prática em dia/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Sua prática está em dia" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /praticar material disponível/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(mocks.refetch).toHaveBeenCalled();
    mocks.overviewError = false;
  });

  it("mostra carregamento como estado explícito e bloqueia ações concorrentes", () => {
    mocks.overviewLoading = true;
    renderPage();

    expect(screen.getByRole("heading", { name: "Preparando seu treino recomendado" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Carregando treino");
    expect(screen.getByRole("button", { name: /começar treino recomendado/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^praticar material disponível/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /gerar novas questões e flashcards/i })).toBeDisabled();
    mocks.overviewLoading = false;
  });

  it("bloqueia recomendação e treino livre sem edital carregado no ciclo", () => {
    mocks.overview.scope = { status: "no_active_edital", subjectIds: [], activeEditalCount: 0 };
    mocks.overview.dailyRecommendation = { kind: "clear", count: 0, topicCount: 0, reason: "clear", estimatedMinutes: 0 };
    renderPage();

    expect(screen.getByRole("heading", { name: "Nenhum edital carregado no Ciclo de Estudos." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Carregar edital no ciclo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /praticar material disponível/i })).not.toBeInTheDocument();
  });

  it("separa a fila diária do treino livre", () => {
    mocks.overview.scope = { status: "active", subjectIds: ["subject-1"], activeEditalCount: 1 };
    mocks.overview.dailyRecommendation = { kind: "clear", count: 0, topicCount: 0, reason: "clear", estimatedMinutes: 0 };
    renderPage();

    expect(screen.getByText(/Sua próxima ação · recomendado/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Prática em dia. Continue seu plano." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pratique o material disponível" })).toBeInTheDocument();
    expect(screen.getByText("Próximo passo")).toBeInTheDocument();
    expect(screen.getByText("Sem treino pendente")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar pelo Ciclo" })).toBeInTheDocument();
    expect(screen.getByTestId("practice-status-icon")).toHaveClass("text-success");
    expect(screen.getAllByRole("button", { name: /^praticar material disponível/i })).toHaveLength(1);
    expect(screen.getByRole("button", { name: /^praticar material disponível/i })).not.toHaveClass("app-button-primary");
    expect(screen.getByRole("button", { name: /gerar novas questões e flashcards/i })).toBeInTheDocument();
    expect(screen.getByText(/pratique o material disponível/i)).toBeInTheDocument();
    expect(screen.getByText(/não altera a agenda dos seus flashcards/i)).toBeInTheDocument();
  });

  it("diferencia revisão de flashcards da recomendação de questões", () => {
    mocks.overview.scope = { status: "active", subjectIds: ["subject-1"], activeEditalCount: 1 };
    setDailyFlashcards();
    const { rerender } = renderPage();

    expect(screen.getByText("Revisão de flashcards")).toBeInTheDocument();
    expect(screen.getByText("2 flashcards agora")).toBeInTheDocument();
    expect(screen.getByText("Já chegou a data de revisá-los")).toBeInTheDocument();
    expect(screen.getByText("Agenda própria do Treino; revisões do Ciclo continuam em Revisões.")).toBeInTheDocument();
    expect(screen.getByTestId("practice-status-icon")).toHaveClass("text-warning");

    setDailyQuestion();
    rerender(<MemoryRouter initialEntries={["/treino"]}><PracticeHome /></MemoryRouter>);

    expect(screen.getByText("3 questões agora")).toBeInTheDocument();
    expect(screen.getByTestId("practice-status-icon")).toHaveClass("text-primary");
  });

  it("nomeia cartões novos como primeiro contato e monta somente essa fila", async () => {
    mocks.overview.dailyRecommendation = {
      kind: "flashcards_new", count: 2, topicCount: 1, reason: "flashcards_new", estimatedMinutes: 2,
      topic: {
        id: "topic-1", subjectId: "subject-1", subjectName: "Direito Administrativo", name: "Atos administrativos",
        nextReview: null, difficultyLevel: 2, lastReviewedAt: "2026-08-31T12:00:00.000Z", questionCount: 6, flashcardCount: 4,
      },
    };
    mocks.build.mockResolvedValueOnce({ status: "ready", session: questionSession, reused: false });
    renderPage();

    expect(screen.getByText("Primeiro contato · flashcards")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Conhecer 2 flashcards" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /começar treino recomendado/i }));
    expect(mocks.build).toHaveBeenCalledWith(expect.objectContaining({ mode: "flashcards_due", flashcardPurpose: "new" }));
  });

  it("monta a recomendação diária sem iniciar geração de IA", async () => {
    mocks.overview.scope = { status: "active", subjectIds: ["subject-1"], activeEditalCount: 1 };
    setDailyQuestion();
    mocks.build.mockResolvedValueOnce({ status: "ready", session: questionSession, reused: false });
    renderPage();

    const dailyRecommendation = screen.getByRole("region", { name: "Praticar 3 questões" });
    expect(within(dailyRecommendation).getByRole("button", { name: /começar treino recomendado/i })).toBeInTheDocument();
    expect(screen.getByText("3 questões disponíveis neste tópico")).toBeInTheDocument();
    expect(within(dailyRecommendation).queryByRole("button", { name: /praticar material disponível/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^praticar material disponível/i })).not.toHaveClass("app-button-primary");
    fireEvent.click(screen.getByRole("button", { name: /começar treino recomendado/i }));

    expect(await screen.findByRole("dialog", { name: /questões rápidas/i })).toBeInTheDocument();
    expect(mocks.build).toHaveBeenCalledWith(expect.objectContaining({
      mode: "questions", topicId: "topic-1", origin: "daily_recommendation", format: "questions", quantity: 3,
    }));
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("abre a fila diária de flashcards pelo ciclo, sem restringi-la ao tópico exibido", async () => {
    mocks.overview.scope = { status: "active", subjectIds: ["subject-1"], activeEditalCount: 1 };
    setDailyFlashcards();
    mocks.build.mockResolvedValueOnce({ status: "needs_material", topicId: null, reason: "no_due_flashcard" });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /começar treino recomendado/i }));

    expect(mocks.build).toHaveBeenCalledWith(expect.objectContaining({
      mode: "flashcards_due", origin: "daily_recommendation", format: "flashcards", flashcardPurpose: "review", quantity: 2,
    }));
    expect(mocks.build.mock.calls.at(-1)?.[0]).not.toHaveProperty("topicId");
  });

  it("oferece geração explícita para o tópico quando não há material para abrir", async () => {
    mocks.overview.scope = { status: "active", subjectIds: ["subject-1"], activeEditalCount: 1 };
    setDailyQuestion();
    mocks.build.mockResolvedValueOnce({ status: "needs_material", topicId: "topic-1", reason: "no_package" });
    mocks.generate.mockResolvedValueOnce(undefined);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /começar treino recomendado/i }));
    fireEvent.click(await screen.findByRole("button", { name: /gerar questões e flashcards/i }));

    expect(mocks.generate).toHaveBeenCalledWith({
      topicId: "topic-1",
      idempotencyKey: expect.any(String),
      trigger: "explicit",
    });
  });

  it("separa montar treino da criação explícita de material com IA", () => {
    mocks.overview.scope = { status: "active", subjectIds: ["subject-1"], activeEditalCount: 1 };
    mocks.overview.dailyRecommendation = { kind: "clear", count: 0, topicCount: 0, reason: "clear", estimatedMinutes: 0 };
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /^praticar material disponível/i }));
    expect(screen.getByRole("dialog", { name: "Praticar material disponível" })).toBeInTheDocument();
    expect(screen.getByText("O que você quer praticar?")).toBeInTheDocument();
    expect(screen.getByText("Formato")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("dialog", { name: "Praticar material disponível" }), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: /gerar novas questões e flashcards/i }));
    expect(screen.getByRole("dialog", { name: "Gerar questões e flashcards com IA" })).toBeInTheDocument();
  });
});
