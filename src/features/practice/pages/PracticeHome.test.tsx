import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PracticeOverview, PracticeSession } from "@/features/practice/services/practiceService";

const activeOverview = (): PracticeOverview => ({
  scope: { status: "active", subjectIds: ["subject-1"], activeEditalCount: 1 },
  recommendedTopic: null,
  selectedTopic: null,
  materialTopics: [{
    id: "topic-1", subjectId: "subject-1", subjectName: "Direito Administrativo", name: "Atos administrativos",
    questionCount: 6, flashcardCount: 4, dueFlashcardCount: 2, latestPackageCreatedAt: "2026-09-14T12:00:00.000Z", hasReadyPackage: true, isGenerating: false, nextReview: null, difficultyLevel: null, lastReviewedAt: null,
  }],
  flashcards: { dueCount: 2, dueTopicCount: 1, newCount: 0, newTopicCount: 0 },
  recentPerformance: {
    windowDays: 7,
    questions: { correct: 0, incorrect: 0, skipped: 0, answered: 0, accuracyPercentage: 0 },
    flashcards: { recalled: 0, effortful: 0, forgotten: 0, reviewed: 0 },
  },
  studyAction: { kind: "cycle", topic: null, reason: "continue_cycle" },
  dailyRecommendation: { kind: "clear", count: 0, topicCount: 0, reason: "clear", estimatedMinutes: 0 },
});

const mocks = vi.hoisted(() => ({
  build: vi.fn(), generate: vi.fn(), reveal: vi.fn(), submit: vi.fn(), rate: vi.fn(), refetch: vi.fn(),
  overviewError: false, overviewLoading: false, overview: null as PracticeOverview | null,
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "student-1" } }) }));
vi.mock("@/components/ui/combobox", () => ({
  Combobox: ({ id, options, value, onValueChange, disabled }: { id?: string; options: { value: string; label: string }[]; value?: string; onValueChange: (value: string) => void; disabled?: boolean }) => (
    <select id={id} aria-label={id?.includes("topic") ? "Tópico" : "Matéria"} value={value ?? ""} disabled={disabled} onChange={(event) => onValueChange(event.target.value)}>
      <option value="">Escolha</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  ),
}));
vi.mock("@/features/practice/hooks/usePracticeTopicOptions", () => ({
  usePracticeSubjects: () => ({ data: [{ id: "subject-1", name: "Direito Administrativo" }], isLoading: false }),
  usePracticeTopics: (_userId?: string, subjectId?: string) => ({ data: subjectId ? [{ id: "topic-1", name: "Atos administrativos", subjectId }] : [], isLoading: false }),
}));
vi.mock("@/features/practice/hooks/usePracticeSessionActions", () => ({
  usePracticeSessionActions: () => ({
    buildSession: { isPending: false, mutateAsync: mocks.build },
    generatePackage: { isPending: false, mutateAsync: mocks.generate },
    revealItem: { mutateAsync: mocks.reveal }, submitAttempt: { mutateAsync: mocks.submit }, rateItem: { mutateAsync: mocks.rate },
  }),
}));
vi.mock("@/features/practice/hooks/usePracticeOverview", () => ({
  usePracticeOverview: () => ({ data: mocks.overview, isLoading: mocks.overviewLoading, isFetching: false, isError: mocks.overviewError, refetch: mocks.refetch }),
}));

import PracticeHome from "@/features/practice/pages/PracticeHome";

const questionSession: PracticeSession = {
  id: "session-question", mode: "questions", status: "active", topicId: "topic-1",
  items: [{ id: "item-question", type: "true_false", prompt: "A revogação produz efeitos retroativos.", options: [{ id: "certo", label: "Certo" }, { id: "errado", label: "Errado" }], learningObjective: null, depth: "application", targetDifficulty: "intermediate", position: 1, servedReason: "unseen_practice_item" }],
};

const renderPage = () => render(<MemoryRouter initialEntries={["/treino"]}><PracticeHome /></MemoryRouter>);

const applyQuestionRecommendation = () => {
  mocks.overview!.dailyRecommendation = {
    kind: "questions", count: 3, topicCount: 1, reason: "recorded_difficulty", estimatedMinutes: 2,
    topic: { id: "topic-1", subjectId: "subject-1", subjectName: "Direito Administrativo", name: "Atos administrativos", nextReview: null, difficultyLevel: 3, lastReviewedAt: null, questionCount: 6, flashcardCount: 4 },
  };
};

describe("PracticeHome", () => {
  beforeEach(() => {
    mocks.build.mockReset(); mocks.generate.mockReset(); mocks.reveal.mockReset(); mocks.submit.mockReset(); mocks.rate.mockReset(); mocks.refetch.mockReset();
    mocks.overviewError = false;
    mocks.overviewLoading = false;
    mocks.overview = activeOverview();
  });

  it("não confunde erro de consulta com prática em dia", () => {
    mocks.overviewError = true;
    renderPage();
    expect(screen.getByRole("heading", { name: "Não foi possível carregar seu treino" })).toBeInTheDocument();
    expect(screen.getByText(/não vamos considerar sua prática em dia/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(mocks.refetch).toHaveBeenCalled();
  });

  it("mantém o bloqueio de ciclo ausente", () => {
    mocks.overview!.scope = { status: "no_active_edital", subjectIds: [], activeEditalCount: 0 };
    renderPage();
    expect(screen.getByRole("heading", { name: "Nenhum edital carregado no Ciclo de Estudos." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Carregar edital no ciclo" })).toBeInTheDocument();
  });

  it("aplica uma sugestão de questões com motivo separado e abre a sessão correta", async () => {
    applyQuestionRecommendation();
    mocks.build.mockResolvedValueOnce({ status: "ready", session: questionSession, reused: false });
    renderPage();
    expect(await screen.findByText("Sugestão de reforço")).toBeInTheDocument();
    expect(screen.getByText("Matéria:")).toBeInTheDocument();
    expect(screen.getByText("Tópico:")).toBeInTheDocument();
    expect(screen.getAllByText("Atos administrativos")).not.toHaveLength(0);
    expect(screen.getByText("Motivo:")).toBeInTheDocument();
    expect(screen.getByText("Dificuldade registrada")).toBeInTheDocument();
    expect(screen.getAllByText("6 questões prontas")).not.toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Iniciar 3 questões" }));
    await waitFor(() => expect(mocks.build).toHaveBeenCalledWith(expect.objectContaining({ mode: "questions", topicId: "topic-1", origin: "daily_recommendation", format: "questions", quantity: 3 })));
  });

  it("preserva a fila de flashcards vencidos do ciclo sem escopo de matéria ou tópico", async () => {
    mocks.overview!.dailyRecommendation = {
      kind: "flashcards_due", count: 2, topicCount: 1, reason: "flashcards_due", estimatedMinutes: 2,
      topic: { id: "topic-1", subjectId: "subject-1", subjectName: "Direito Administrativo", name: "Atos administrativos", nextReview: null, difficultyLevel: 2, lastReviewedAt: null, questionCount: 6, flashcardCount: 4 },
    };
    mocks.build.mockResolvedValueOnce({ status: "ready", session: questionSession, reused: false });
    renderPage();
    expect(await screen.findByText("Todas as matérias · fila do ciclo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Revisar 2 flashcards" }));
    await waitFor(() => expect(mocks.build).toHaveBeenCalled());
    const [input] = mocks.build.mock.calls[0];
    expect(input).toMatchObject({ mode: "flashcards_due", origin: "daily_recommendation", format: "flashcards", flashcardPurpose: "review", quantity: 2 });
    expect(input).not.toHaveProperty("topicId");
    expect(input).not.toHaveProperty("subjectId");
  });

  it("sugere cartões novos sem reprogramar o agendamento", async () => {
    mocks.overview!.dailyRecommendation = {
      kind: "flashcards_new", count: 3, topicCount: 1, reason: "flashcards_new", estimatedMinutes: 2,
      topic: { id: "topic-1", subjectId: "subject-1", subjectName: "Direito Administrativo", name: "Atos administrativos", nextReview: null, difficultyLevel: 2, lastReviewedAt: null, questionCount: 6, flashcardCount: 4 },
    };
    mocks.build.mockResolvedValueOnce({ status: "ready", session: questionSession, reused: false });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Praticar 3 flashcards" }));
    await waitFor(() => expect(mocks.build).toHaveBeenCalledWith(expect.objectContaining({ mode: "flashcards_due", flashcardPurpose: "new", format: "flashcards", origin: "manual", topicId: "topic-1" })));
  });

  it("troca a sugestão por prática livre e monta o payload manual de flashcards", async () => {
    applyQuestionRecommendation();
    mocks.build.mockResolvedValueOnce({ status: "ready", session: questionSession, reused: false });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Montar treino livre" }));
    expect(screen.getByText("Você está montando um treino livre.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver sugestão de reforço" }));
    expect(screen.getByText("Sugestão de reforço")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Montar treino livre" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Matéria" }), { target: { value: "subject-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Focar em um tópico" }));
    fireEvent.change(screen.getByRole("combobox", { name: /tópico/i }), { target: { value: "topic-1" } });
    fireEvent.click(screen.getByRole("button", { name: /Flashcards.*Recupere a resposta.*2 vencidos hoje/i }));
    fireEvent.click(screen.getByRole("button", { name: "Praticar 3 flashcards" }));
    await waitFor(() => expect(mocks.build).toHaveBeenCalledWith(expect.objectContaining({ mode: "quick", topicId: "topic-1", format: "flashcards", origin: "manual", quantity: 3 })));
    expect(mocks.build.mock.calls[0][0]).not.toHaveProperty("subjectId");
  });

  it("pede tópico antes de gerar e confirma geração para foco sem material", async () => {
    mocks.overview!.materialTopics = [{ id: "topic-1", subjectId: "subject-1", subjectName: "Direito Administrativo", name: "Atos administrativos", questionCount: 0, flashcardCount: 0, dueFlashcardCount: 0, latestPackageCreatedAt: "2026-09-14T12:00:00.000Z", hasReadyPackage: false, isGenerating: false, nextReview: null, difficultyLevel: null, lastReviewedAt: null }];
    mocks.generate.mockResolvedValueOnce(undefined);
    renderPage();
    fireEvent.change(screen.getByRole("combobox", { name: "Matéria" }), { target: { value: "subject-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Focar em um tópico" }));
    fireEvent.change(screen.getByRole("combobox", { name: /tópico/i }), { target: { value: "topic-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Gerar material deste tópico" }));
    expect(await screen.findByText("Gerar material deste tópico?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar material" }));
    await waitFor(() => expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ topicId: "topic-1", trigger: "explicit" })));
  });
});
