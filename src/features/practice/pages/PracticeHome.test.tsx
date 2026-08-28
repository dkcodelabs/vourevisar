import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { PracticeSession } from "@/features/practice/services/practiceService";

const mocks = vi.hoisted(() => ({
  build: vi.fn(),
  generate: vi.fn(),
  reveal: vi.fn(),
  submit: vi.fn(),
  rate: vi.fn(),
  refetch: vi.fn(),
  overview: {
    scope: { status: "active", subjectIds: ["subject-1"], activeEditalCount: 1 },
    recommendedTopic: null,
    selectedTopic: null,
    flashcards: { dueCount: 0, dueTopicCount: 0 },
    dailyRecommendation: { kind: "clear", count: 0, topicCount: 0, reason: "clear", estimatedMinutes: 0 },
  },
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
  usePracticeOverview: () => ({ data: mocks.overview, isLoading: false, isError: false, refetch: mocks.refetch }),
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

describe("PracticeHome", () => {
  it("bloqueia recomendação e treino livre sem edital carregado no ciclo", () => {
    mocks.overview.scope = { status: "no_active_edital", subjectIds: [], activeEditalCount: 0 };
    mocks.overview.dailyRecommendation = { kind: "clear", count: 0, topicCount: 0, reason: "clear", estimatedMinutes: 0 };
    renderPage();

    expect(screen.getByRole("heading", { name: "Nenhum edital carregado no Ciclo de Estudos." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Carregar edital no ciclo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /montar treino/i })).not.toBeInTheDocument();
  });

  it("separa a fila diária do treino livre", () => {
    mocks.overview.scope = { status: "active", subjectIds: ["subject-1"], activeEditalCount: 1 };
    mocks.overview.dailyRecommendation = { kind: "clear", count: 0, topicCount: 0, reason: "clear", estimatedMinutes: 0 };
    renderPage();

    expect(screen.getByText("Agora para você")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sua prática está em dia" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pratique do seu jeito" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /montar treino/i }).length).toBeGreaterThan(0);
  });

  it("monta a recomendação diária sem iniciar geração de IA", async () => {
    mocks.overview.scope = { status: "active", subjectIds: ["subject-1"], activeEditalCount: 1 };
    setDailyQuestion();
    mocks.build.mockResolvedValueOnce({ status: "ready", session: questionSession, reused: false });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /começar agora/i }));

    expect(await screen.findByRole("dialog", { name: /questões rápidas/i })).toBeInTheDocument();
    expect(mocks.build).toHaveBeenCalledWith(expect.objectContaining({
      mode: "questions", topicId: "topic-1", origin: "daily_recommendation", format: "questions", quantity: 3,
    }));
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("abre o construtor livre em vez de misturar filtros na home", () => {
    mocks.overview.scope = { status: "active", subjectIds: ["subject-1"], activeEditalCount: 1 };
    mocks.overview.dailyRecommendation = { kind: "clear", count: 0, topicCount: 0, reason: "clear", estimatedMinutes: 0 };
    renderPage();

    fireEvent.click(screen.getAllByRole("button", { name: /montar treino/i })[0]);
    expect(screen.getByRole("dialog", { name: "Montar treino" })).toBeInTheDocument();
    expect(screen.getByText("O que você quer fazer?")).toBeInTheDocument();
    expect(screen.getAllByText("Formato").length).toBeGreaterThan(1);
  });
});
