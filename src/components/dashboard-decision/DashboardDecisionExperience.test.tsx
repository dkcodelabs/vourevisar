import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ActivityPeriodSummary,
  DashboardDecisionExperience,
  RecentRemindersCard,
} from './DashboardDecisionExperience';
import type { DashboardActivityDay, DashboardDecisionModel } from '@/types/dashboardDecision';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

const missingCycleModel: DashboardDecisionModel = {
  isLoading: false,
  error: null,
  examContext: {
    editalName: null,
    position: null,
    examDate: null,
    daysRemaining: null,
    state: 'missing_cycle',
  },
  pace: {
    state: 'missing_cycle',
    daysRemaining: null,
    newTopicsPerDay: null,
    reviewsPerDay: null,
    unstartedTopics: 0,
    pendingReviews: 0,
    futureReviewsInWindow: 0,
    explanation: 'Carregue um ciclo.',
  },
  nextBestAction: {
    id: 'load-cycle',
    kind: 'load_cycle',
    tone: 'info',
    title: 'Carregar ciclo',
    description: 'Carregue um edital.',
    reason: 'Sem ciclo ativo.',
    primaryLabel: 'Carregar',
    primaryHref: '/ciclo-estudos',
    target: {},
    priorityScore: 0,
  },
  actionQueue: [],
  continueCycleItems: [],
  reminders: [],
  activityDays: [{
    date: '2026-06-21',
    studiedCount: 1,
    reviewedCount: 0,
    questionsCount: 0,
    totalDurationMinutes: 30,
    difficultyAverage: null,
    entries: [{
      id: 'archived-entry',
      topicId: 'archived-topic',
      topicName: 'Tópico de edital arquivado',
      subjectName: 'Matéria arquivada',
      durationMinutes: 30,
      reviewedAt: '2026-06-21T10:00:00.000Z',
      type: 'study',
    }],
  }],
  chargeCoverage: 'none',
  chargeSummary: {
    low: 0,
    medium: 0,
    high: 0,
    analyzedTopics: 0,
    totalTopics: 0,
    unanalyzedTopics: 0,
    highOverdue: { count: 0, topicId: null },
    highUnstarted: { count: 0, topicId: null },
    highInReview: { count: 0, topicId: null },
  },
  difficultySummary: { easy: 0, medium: 0, hard: 0, totalRated: 0 },
  progressSummary: {
    startedTopics: 0,
    inProgressTopics: 0,
    completedTopics: 0,
    totalTopics: 0,
    editalProgressPercentage: 0,
  },
  totals: {
    overdueReviews: 0,
    todayReviews: 0,
    futureReviews: 0,
    unstartedTopics: 0,
    startedTopics: 0,
    completedTopics: 0,
    totalTopics: 0,
  },
};

describe('DashboardDecisionExperience', () => {
  it('shows only the cycle setup state when there is no active edital', () => {
    const onNavigate = vi.fn();

    render(
      <DashboardDecisionExperience
        model={missingCycleModel}
        activityRange={7}
        onActivityRangeChange={vi.fn()}
        onNavigate={onNavigate}
        onAddReminder={vi.fn()}
        onToggleReminder={vi.fn()}
        onDeleteReminder={vi.fn()}
        isAddingReminder={false}
        isDeletingReminder={false}
      />,
    );

    expect(screen.getByText('Nenhum edital carregado no Ciclo de Estudos.')).toBeInTheDocument();
    expect(screen.queryByText('Consistência recente')).not.toBeInTheDocument();
    expect(screen.queryByText('Tópico de edital arquivado')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Carregar edital no ciclo' }));
    expect(onNavigate).toHaveBeenCalledWith('/ciclo-estudos');
  });

  it('shows the subject above the topic and keeps first contact beside the action badge', () => {
    render(
      <DashboardDecisionExperience
        model={{
          ...missingCycleModel,
          examContext: {
            editalName: 'TRT',
            position: 'Analista',
            examDate: '2026-08-01',
            daysRemaining: 40,
            state: 'ready',
          },
          pace: {
            ...missingCycleModel.pace,
            state: 'ready',
          },
          nextBestAction: {
            id: 'start-portugues-crase',
            kind: 'start_cycle_topic',
            tone: 'info',
            title: 'Crase',
            description: 'PORTUGUES • Primeiro contato',
            reason: 'Respeita a ordem que você definiu no Ciclo de Estudos.',
            scientificBasis: 'Primeiro contato organizado reduz troca de contexto e mantém progresso incremental.',
            primaryLabel: 'Iniciar estudo',
            primaryHref: '/ciclo-estudos',
            secondaryLabel: 'Ver no ciclo',
            secondaryHref: '/ciclo-estudos',
            target: {
              subjectName: 'PORTUGUES',
              topicName: 'Crase',
            },
            priorityScore: 100,
          },
          totals: {
            ...missingCycleModel.totals,
            unstartedTopics: 3,
            totalTopics: 3,
          },
          progressSummary: {
            ...missingCycleModel.progressSummary,
            totalTopics: 3,
          },
        }}
        activityRange={7}
        onActivityRangeChange={vi.fn()}
        onNavigate={vi.fn()}
        onAddReminder={vi.fn()}
        onToggleReminder={vi.fn()}
        onDeleteReminder={vi.fn()}
        isAddingReminder={false}
        isDeletingReminder={false}
      />,
    );

    expect(screen.getByRole('heading', { name: 'PORTUGUES' })).toBeInTheDocument();
    expect(screen.getByTitle('Crase')).toBeInTheDocument();
    expect(screen.getByText('A iniciar')).toBeInTheDocument();
    expect(screen.getByText('Primeiro contato')).toBeInTheDocument();
    expect(screen.getByText('Base científica:')).toBeInTheDocument();
    expect(screen.queryByText('Base da recomendação')).not.toBeInTheDocument();
  });
});

describe('ActivityPeriodSummary', () => {
  it('expands and collapses the complete period list inside the card', () => {
    const entries: DashboardActivityDay['entries'] = Array.from({ length: 3 }, (_, index) => ({
      id: `study-${index + 1}`,
      topicId: `topic-${index + 1}`,
      topicName: `Tópico ${index + 1}`,
      subjectName: 'Direito Constitucional',
      durationMinutes: 30,
      reviewedAt: `2026-06-2${index}T10:00:00.000Z`,
      type: 'study',
    }));
    const days: DashboardActivityDay[] = [{
      date: '2026-06-21',
      studiedCount: 3,
      reviewedCount: 0,
      questionsCount: 0,
      totalDurationMinutes: 90,
      difficultyAverage: null,
      entries,
    }];

    render(<ActivityPeriodSummary days={days} range={7} />);

    expect(screen.queryByTitle('Direito Constitucional — Tópico 3')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver tudo' }));

    expect(screen.getByTitle('Direito Constitucional — Tópico 3')).toBeInTheDocument();
    expect(screen.getByTestId('activity-period-card')).toHaveClass('h-[272px]');
    expect(screen.getByTestId('activity-period-list')).toHaveClass('overflow-y-auto');
    expect(screen.getByTestId('activity-period-list')).toHaveClass('min-h-0');
    expect(screen.getByRole('button', { name: 'Recolher' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Recolher' }));

    expect(screen.queryByTitle('Direito Constitucional — Tópico 3')).not.toBeInTheDocument();
  });
});

describe('RecentRemindersCard', () => {
  it('shows the illustrated empty state when there are no reminders', () => {
    render(
      <RecentRemindersCard
        reminders={[]}
        onAddReminder={vi.fn()}
        onToggleReminder={vi.fn()}
        onDeleteReminder={vi.fn()}
        isAdding={false}
        isDeleting={false}
      />,
    );

    expect(screen.getByRole('img', { name: 'Bloco de notas vazio com lápis' })).toHaveAttribute(
      'src',
      '/images/dashboard/reminders-empty-state.png',
    );
    expect(screen.getByText('Sua lista está livre')).toBeInTheDocument();
    expect(screen.getByText('Adicione algo quando precisar.')).toBeInTheDocument();
  });

  it('does not show creation or completion history in the expanded list', () => {
    render(
      <RecentRemindersCard
        reminders={[
          {
            id: 'reminder-1',
            text: 'Revisar constitucional',
            reminderDate: '2026-06-21',
            completed: true,
            createdAt: '2026-06-19T11:51:00.000Z',
            completedAt: null,
          },
        ]}
        onAddReminder={vi.fn()}
        onToggleReminder={vi.fn()}
        onDeleteReminder={vi.fn()}
        isAdding={false}
        isDeleting={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ver todos' }));

    expect(screen.getByText('Revisar constitucional')).toBeInTheDocument();
    expect(screen.queryByText(/Criado 19\/06\/2026/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Concluído sem data registrada/)).not.toBeInTheDocument();
  });

  it('asks for confirmation before permanently deleting a reminder', () => {
    const onDeleteReminder = vi.fn().mockResolvedValue(undefined);

    render(
      <RecentRemindersCard
        reminders={[
          {
            id: 'reminder-1',
            text: 'Revisar constitucional',
            reminderDate: '2026-06-21',
            completed: false,
            createdAt: '2026-06-19T11:51:00.000Z',
            completedAt: null,
          },
        ]}
        onAddReminder={vi.fn()}
        onToggleReminder={vi.fn()}
        onDeleteReminder={onDeleteReminder}
        isAdding={false}
        isDeleting={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Excluir lembrete: Revisar constitucional' }));

    expect(screen.getByText('Excluir lembrete definitivamente?')).toBeInTheDocument();
    expect(onDeleteReminder).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Excluir definitivamente' }));

    expect(onDeleteReminder).toHaveBeenCalledWith('reminder-1');
  });

  it('keeps the expanded reminder list horizontally contained with a compact delete action', () => {
    render(
      <RecentRemindersCard
        reminders={[
          {
            id: 'reminder-1',
            text: 'Revisar constitucional',
            reminderDate: '2026-06-21',
            completed: false,
            createdAt: null,
            completedAt: null,
          },
        ]}
        onAddReminder={vi.fn()}
        onToggleReminder={vi.fn()}
        onDeleteReminder={vi.fn()}
        isAdding={false}
        isDeleting={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ver todos' }));

    expect(screen.getByTestId('reminders-list')).toHaveClass('overflow-x-hidden');
    expect(screen.getByRole('button', { name: 'Excluir lembrete: Revisar constitucional' })).toHaveClass('size-5');
  });
});
