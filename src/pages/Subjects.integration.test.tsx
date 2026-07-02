import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Subject, UserCycle } from '@/types';
import Subjects from './Subjects';

type CyclePageScenario = {
  subjects: Subject[];
  cycle: UserCycle | null;
  originsLoading?: boolean;
  subjectsError?: Error;
};

const testState = vi.hoisted(() => ({
  scenario: null as CyclePageScenario | null,
  originsSnapshot: null as Record<string, unknown> | null,
  user: { id: 'user-1', email: 'aluno@example.com' },
  refresh: vi.fn().mockResolvedValue(undefined),
  getOriginsForSubject: vi.fn(() => []),
  getUnifiedSubjectName: vi.fn((_id: string, name: string) => name),
  isSubjectMerged: vi.fn(() => false),
  getSubjectOrigins: vi.fn(() => []),
  revertSubjectMerge: vi.fn(),
  getSubjectMergeInfo: vi.fn(() => null),
  openReviewModal: vi.fn(),
  closeDifficultyModal: vi.fn(),
  markTopicAsReviewed: vi.fn(),
  mergeSnapshot: null as Record<string, unknown> | null,
  topicReviewSnapshot: null as Record<string, unknown> | null,
}));

const getScenario = () => {
  if (!testState.scenario) throw new Error('Cenário de teste não configurado');
  return testState.scenario;
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: testState.user }),
}));

vi.mock('@/hooks/useEditalOriginsWithMerge', () => ({
  useEditalOriginsWithMerge: () => {
    getScenario();
    return testState.originsSnapshot;
  },
}));

vi.mock('@/hooks/useMergeData', () => ({
  useMergeData: () => testState.mergeSnapshot,
}));

vi.mock('@/hooks/useTopicReview', () => ({
  useTopicReview: () => testState.topicReviewSnapshot,
}));

vi.mock('@/contexts/utils/dataTransformers', () => ({
  transformSubjectsData: (data: Subject[]) => data,
}));

vi.mock('@/services/dataIntegrityService', () => ({
  performGlobalCleanup: vi.fn(),
  repairOrphanedSubjects: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/topicReviewService', () => ({
  fetchTopicReviewStats: vi.fn().mockResolvedValue(new Map()),
  fetchTopicReviewStudyMinutes: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock('@/services/cycleStudyEventsService', () => ({
  recordCycleStudyEvent: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/errors/errorService', () => ({
  errorService: { report: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <div>Carregando ciclo</div>,
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
  Tooltip: ({ children }: React.PropsWithChildren) => <>{children}</>,
  TooltipTrigger: ({ children }: React.PropsWithChildren) => <>{children}</>,
  TooltipContent: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: React.PropsWithChildren) => <>{children}</>,
  closestCenter: vi.fn(),
  KeyboardSensor: class {},
  PointerSensor: class {},
  useSensor: () => ({}),
  useSensors: () => [],
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: React.PropsWithChildren) => <>{children}</>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: {},
  arrayMove: <T,>(items: T[]) => items,
}));

vi.mock('@/components/SortableItem', () => ({
  SortableItem: ({ children }: { children: React.ReactNode | ((props: { listeners: Record<string, never>; attributes: Record<string, never> }) => React.ReactNode) }) => (
    <>{typeof children === 'function' ? children({ listeners: {}, attributes: {} }) : children}</>
  ),
}));

vi.mock('@/components/topics/TopicsModal', () => ({ default: () => null }));
vi.mock('@/components/ContentUploadModal', () => ({ default: () => null }));
vi.mock('@/components/reviews/NotesModal', () => ({ default: () => null }));
vi.mock('@/components/subjects/ImportEditalModal', () => ({ ImportEditalModal: () => null }));
vi.mock('@/components/ui/ConfirmModal', () => ({ default: () => null }));
vi.mock('@/components/topics/CreateTopicModal', () => ({ CreateTopicModal: () => null }));
vi.mock('@/components/editais/EditalSubjectsModal', () => ({ EditalSubjectsModal: () => null }));
vi.mock('@/components/modals/DifficultyRatingModal', () => ({ DifficultyRatingModal: () => null }));

type QueryResult = { data: unknown; error: Error | null };

const getTableResult = async (table: string): Promise<QueryResult> => {
  const current = getScenario();
  if (table === 'subjects') {
    if (current.subjectsError) throw current.subjectsError;
    return { data: current.subjects, error: null };
  }
  if (table === 'user_cycles') {
    return { data: current.cycle ? [current.cycle] : [], error: null };
  }
  return { data: [], error: null };
};

const createQueryBuilder = (table: string) => {
  const builder = new Proxy({}, {
    get: (_target, property) => {
      if (property === 'then') {
        return (resolve: (result: QueryResult) => void, reject: (error: unknown) => void) =>
          getTableResult(table).then(resolve, reject);
      }
      return () => builder;
    },
  });
  return builder;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => createQueryBuilder(table),
  },
}));

const setScenario = (scenario: CyclePageScenario) => {
  testState.scenario = scenario;
  const subjectIds = scenario.subjects.map(subject => subject.id);
  testState.originsSnapshot = {
    originsMap: new Map(),
    editaisData: [],
    editaisNoCiclo: subjectIds.length > 0
      ? [{ id: 'edital-1', name: 'Edital Teste', subject_ids: subjectIds, active_subject_ids: subjectIds }]
      : [],
    activeSubjectIdsSet: new Set(subjectIds),
    getOriginsForSubject: testState.getOriginsForSubject,
    refresh: testState.refresh,
    isLoading: scenario.originsLoading ?? false,
  };
  testState.mergeSnapshot = {
    getUnifiedSubjectName: testState.getUnifiedSubjectName,
    isSubjectMerged: testState.isSubjectMerged,
    getSubjectOrigins: testState.getSubjectOrigins,
    revertSubjectMerge: testState.revertSubjectMerge,
    getSubjectMergeInfo: testState.getSubjectMergeInfo,
    dynamicUnificationMap: null,
  };
  testState.topicReviewSnapshot = {
    openReviewModal: testState.openReviewModal,
    difficultyModalData: {
      isOpen: false,
      topicId: '',
      topicName: '',
      subjectId: '',
      subjectName: '',
      currentDifficulty: null,
      reviewStage: '',
      reviewCount: 0,
      isCompleting: false,
    },
    closeDifficultyModal: testState.closeDifficultyModal,
    markTopicAsReviewed: testState.markTopicAsReviewed,
    isLoading: false,
  };
};

const makeTopic = (overrides: Partial<Subject['topics'][number]> = {}): Subject['topics'][number] => ({
  id: 'topic-1',
  name: 'Controle de Constitucionalidade',
  completed: false,
  reviewCount: 0,
  review_count: 0,
  is_active: true,
  is_hidden: false,
  ...overrides,
});

const makeSubject = (topic = makeTopic()): Subject => ({
  id: 'subject-1',
  name: 'Direito Constitucional',
  status: 'Em Estudo',
  edital_id: 'edital-1',
  is_visible: true,
  topics: [topic],
});

const makeCycle = (): UserCycle => ({
  id: 'cycle-1',
  user_id: 'user-1',
  name: 'Ciclo TRT',
  status: 'active',
  ciclo_atual: ['subject-1'],
  disciplinas_do_dia: ['subject-1'],
  materias_pendentes: ['subject-1'],
  materias_estudadas_ciclo: [],
  ciclos_realizados: 0,
  data_inicio_ciclo: '2026-07-01T10:00:00.000Z',
  data_fim_ciclo: null,
  atualizado_em: '2026-07-01T10:00:00.000Z',
  created_at: '2026-07-01T10:00:00.000Z',
});

const renderSubjects = () => render(
  <MemoryRouter
    initialEntries={['/ciclo-estudos']}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <Routes>
      <Route path="/ciclo-estudos" element={<Subjects />} />
      <Route path="/meus-editais" element={<div>Destino Meus Editais</div>} />
      <Route path="/revisoes" element={<div>Destino Revisões</div>} />
      <Route path="/estatisticas" element={<div>Destino Estatísticas</div>} />
    </Routes>
  </MemoryRouter>,
);

describe('Subjects cycle integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    setScenario({ subjects: [], cycle: null });
  });

  it('keeps the loading state while edital origins are loading', async () => {
    setScenario({ subjects: [], cycle: null, originsLoading: true });

    renderSubjects();

    expect(await screen.findByText('Carregando ciclo')).toBeInTheDocument();
    expect(screen.queryByText('Seu ciclo ainda não está montado')).not.toBeInTheDocument();
  });

  it('shows the empty state only after loading and navigates to Meus Editais', async () => {
    renderSubjects();

    expect(await screen.findByText('Seu ciclo ainda não está montado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ir para Meus Editais' }));
    expect(screen.getByText('Destino Meus Editais')).toBeInTheDocument();
  });

  it('shows a retryable error instead of an empty cycle when subjects fail', async () => {
    setScenario({
      subjects: [],
      cycle: null,
      subjectsError: new Error('Failed to fetch'),
    });

    renderSubjects();

    expect(await screen.findByText('Não foi possível carregar seu ciclo.')).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: 'Tentar novamente' });
    expect(screen.queryByText('Seu ciclo ainda não está montado')).not.toBeInTheDocument();

    setScenario({ subjects: [], cycle: null });
    fireEvent.click(retryButton);

    expect(await screen.findByText('Seu ciclo ainda não está montado')).toBeInTheDocument();
    expect(screen.queryByText('Não foi possível carregar seu ciclo.')).not.toBeInTheDocument();
  });

  it('shows an actionable new topic without offering a new cycle', async () => {
    setScenario({ subjects: [makeSubject()], cycle: makeCycle() });

    renderSubjects();

    const subjectName = await screen.findByText('Direito Constitucional');
    fireEvent.click(subjectName);

    expect(screen.getByText('Controle de Constitucionalidade')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar estudo do tópico Controle de Constitucionalidade' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Novo Ciclo/i })).not.toBeInTheDocument();
  });

  it('prioritizes overdue reviews after every topic has started', async () => {
    const topic = makeTopic({
      reviewCount: 1,
      review_count: 1,
      reviewStage: '24h',
      review_stage: '24h',
      first_studied_at: '2026-07-01T11:00:00.000Z',
      next_review: '2020-01-01T10:00:00.000Z',
    });
    setScenario({ subjects: [makeSubject(topic)], cycle: makeCycle() });

    renderSubjects();

    const reviewButton = await screen.findByRole('button', { name: 'Revisar atrasadas' });
    expect(screen.queryByRole('button', { name: /Novo Ciclo/i })).not.toBeInTheDocument();
    fireEvent.click(reviewButton);
    expect(screen.getByText('Destino Revisões')).toBeInTheDocument();
  });

  it('shows performance after the review program is truly completed', async () => {
    const topic = makeTopic({
      completed: true,
      reviewCount: 5,
      review_count: 5,
      reviewStage: 'Concluído',
      review_stage: 'Concluído',
      first_studied_at: '2026-07-01T11:00:00.000Z',
      next_review: null,
    });
    setScenario({ subjects: [makeSubject(topic)], cycle: makeCycle() });

    renderSubjects();

    const performanceButton = await screen.findByRole('button', { name: 'Ver desempenho' });
    expect(screen.queryByRole('button', { name: /Novo Ciclo/i })).not.toBeInTheDocument();
    fireEvent.click(performanceButton);
    expect(screen.getByText('Destino Estatísticas')).toBeInTheDocument();
  });
});
