import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  DashboardDecisionExperience,
  RecentRemindersCard,
} from './DashboardDecisionExperience';
import { NextBestActionCard } from './NextBestActionCard';
import { PriorityQueueCard } from './PriorityQueueCard';
import { ProgressSummaryCard } from './ProgressSummaryCard';
import { ExamPacePanel } from './ExamPacePanel';
import { DashboardDataIssueNotice } from './DashboardDataIssueNotice';
import { DashboardCommandHero } from './DashboardCommandHero';
import type { DashboardAction, DashboardDecisionModel } from '@/types/dashboardDecision';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

const missingCycleModel: DashboardDecisionModel = {
  isLoading: false,
  error: null,
  dataIssues: [],
  studyEntryState: 'no-edital',
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
    primaryHref: '/meus-editais',
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
  }],
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
        onNavigate={onNavigate}
        onAddReminder={vi.fn()}
        onToggleReminder={vi.fn()}
        onDeleteReminder={vi.fn()}
        onUpdateCycleName={vi.fn()}
        isAddingReminder={false}
        isDeletingReminder={false}
        isUpdatingCycleName={false}
      />,
    );

    expect(screen.getByText('Você ainda não possui nenhum edital cadastrado.')).toBeInTheDocument();
    expect(screen.queryByText('Consistência recente')).not.toBeInTheDocument();
    expect(screen.queryByText('Tópico de edital arquivado')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar edital' }));
    expect(onNavigate).toHaveBeenCalledWith('/meus-editais');
  });

  it('keeps the subject, topic and reason while deferring the complementary explanation', () => {
    const onNavigate = vi.fn();
    render(
      <DashboardDecisionExperience
        model={{
          ...missingCycleModel,
          examContext: {
            editalName: 'TRT',
            position: 'Analista',
            editalId: 'edital-1',
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
              subjectId: 'subject-portugues',
              topicId: 'topic-crase',
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
        onNavigate={onNavigate}
        onAddReminder={vi.fn()}
        onToggleReminder={vi.fn()}
        onDeleteReminder={vi.fn()}
        onUpdateCycleName={vi.fn()}
        isAddingReminder={false}
        isDeletingReminder={false}
        isUpdatingCycleName={false}
      />,
    );

    expect(screen.getByRole('heading', { name: 'PORTUGUES' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Melhor próxima ação' })).getByTitle('Crase')).toBeInTheDocument();
    expect(screen.getByText('Primeiro contato')).toBeInTheDocument();
    expect(screen.getByText('Respeita a ordem que você definiu no Ciclo de Estudos.')).toBeVisible();
    expect(screen.queryByText('Primeiro contato organizado reduz troca de contexto e mantém progresso incremental.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Como foi definida' }));
    expect(screen.getByText('Primeiro contato organizado reduz troca de contexto e mantém progresso incremental.')).toBeVisible();
    expect(screen.queryByText('Prioridade máxima')).not.toBeInTheDocument();
    expect(screen.getByText('Seu ritmo até a prova')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir Evolução completa' })).toBeInTheDocument();
    expect(screen.queryByText('Consistência recente')).not.toBeInTheDocument();
    expect(screen.queryByText('Mapa de dificuldade')).not.toBeInTheDocument();
    expect(screen.queryByText('Mapa de cobrança')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar estudo' }));
    fireEvent.click(screen.getByRole('button', { name: /Ciclo de estudos \(3\)/i }));
    expect(onNavigate).toHaveBeenCalledTimes(2);
    expect(onNavigate).toHaveBeenNthCalledWith(1, '/ciclo-estudos', {
      subjectId: 'subject-portugues', topicId: 'topic-crase', subjectName: 'PORTUGUES', topicName: 'Crase',
    });
    expect(onNavigate).toHaveBeenNthCalledWith(2, ...onNavigate.mock.calls[0]);
  });
});

describe('DashboardCommandHero', () => {
  const readyModel: DashboardDecisionModel = {
    ...missingCycleModel,
    examContext: {
      editalName: 'TRT', position: 'Analista', editalId: 'edital-1', examDate: '2026-10-08', daysRemaining: 40, state: 'ready',
    },
    totals: { ...missingCycleModel.totals, overdueReviews: 4, todayReviews: 2, unstartedTopics: 8 },
  };

  it('uses an opaque destructive icon treatment without changing metric destinations', () => {
    const onNavigate = vi.fn();
    render(
      <DashboardCommandHero
        model={readyModel}
        onNavigate={onNavigate}
        onUpdateCycleName={vi.fn()}
        isUpdatingCycleName={false}
      />,
    );

    const overdueButton = screen.getByRole('button', { name: 'Revisões atrasadas: 4' });
    const overdueIcon = overdueButton.querySelector('[data-metric-icon="danger"]');
    expect(overdueIcon).toHaveClass('bg-destructive', 'text-destructive-foreground', 'border-destructive/70');
    expect(overdueIcon).not.toHaveClass('bg-destructive/10', 'text-destructive');

    fireEvent.click(overdueButton);
    fireEvent.click(screen.getByRole('button', { name: 'Revisões para hoje: 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tópicos a iniciar: 8' }));
    expect(onNavigate).toHaveBeenNthCalledWith(1, '/revisoes');
    expect(onNavigate).toHaveBeenNthCalledWith(2, '/revisoes');
    expect(onNavigate).toHaveBeenNthCalledWith(3, '/ciclo-estudos');
  });

  it('preserves trimmed cycle-name editing after extraction', async () => {
    const onUpdateCycleName = vi.fn().mockResolvedValue(undefined);
    render(
      <DashboardCommandHero
        model={readyModel}
        onNavigate={vi.fn()}
        onUpdateCycleName={onUpdateCycleName}
        isUpdatingCycleName={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'TRT' }));
    const input = screen.getByRole('textbox', { name: 'Nome do ciclo' });
    fireEvent.change(input, { target: { value: '  Ciclo TRT  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(onUpdateCycleName).toHaveBeenCalledExactlyOnceWith('Ciclo TRT'));
    expect(screen.queryByRole('textbox', { name: 'Nome do ciclo' })).not.toBeInTheDocument();
  });
});

describe('ExamPacePanel', () => {
  const pace: DashboardDecisionModel['pace'] = {
    state: 'ready', daysRemaining: 10, newTopicsPerDay: 2, reviewsPerDay: 1,
    unstartedTopics: 20, pendingReviews: 10, futureReviewsInWindow: 2, explanation: 'Base calculada.',
  };
  const days = [{ ...missingCycleModel.activityDays[0], studiedCount: 3, reviewedCount: 0 }];

  it('keeps targets and recent average while sending historical analysis to Evolution', () => {
    const onNavigate = vi.fn();
    render(<ExamPacePanel pace={pace} activityDays={days} onNavigate={onNavigate} />);
    const panel = screen.getByRole('region', { name: 'Seu ritmo até a prova' });
    expect(within(panel).getByText('10 dias até a prova · metas diárias necessárias')).toBeVisible();
    expect(within(panel).getByText('Média recente: 3,0/dia')).toBeVisible();
    expect(within(panel).getByText('Seu ritmo atual já acompanha a meta')).toBeVisible();
    expect(within(panel).getByText('Ainda sem histórico recente')).toBeVisible();
    expect(within(panel).queryByText('Sua média ainda está abaixo da meta')).not.toBeInTheDocument();
    expect(within(panel).queryByText('Como o ritmo foi calculado')).not.toBeInTheDocument();

    const trigger = within(panel).getByRole('button', { name: 'Detalhes do ritmo' });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(within(panel).getByText('Base atual: 20 tópicos e 10 revisões em 10 dias.')).toBeVisible();
    expect(within(panel).queryByRole('img', { name: /Atividade recente/ })).not.toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();
    fireEvent.click(within(panel).getByRole('button', { name: 'Abrir Ciclo de Estudos' }));
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('/ciclo-estudos');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(within(panel).queryByText('Como o ritmo foi calculado')).not.toBeInTheDocument();
    expect(within(panel).getByText('Média recente: 3,0/dia')).toBeVisible();
    fireEvent.click(within(panel).getByRole('button', { name: 'Abrir Evolução completa' }));
    expect(onNavigate).toHaveBeenNthCalledWith(2, '/estatisticas');
  });

  it.each([
    ['missing_exam_date', 'Definir data da prova'],
    ['exam_date_past', 'Atualizar data da prova'],
    ['missing_cycle', 'Carregar edital no ciclo'],
  ] as const)('keeps the explanation and configuration visible for %s', (state, label) => {
    const onNavigate = vi.fn();
    render(<ExamPacePanel pace={{ ...pace, state, newTopicsPerDay: null, reviewsPerDay: null, explanation: 'Ajuste o contexto da prova.' }} activityDays={[]} onNavigate={onNavigate} />);
    expect(screen.getByText('Ajuste o contexto da prova.')).toBeVisible();
    expect(screen.getAllByText('--')).toHaveLength(2);
    expect(screen.queryByText(/acompanha a meta|abaixo da meta/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('/meus-editais');
  });

  it('does not invent targets or a configuration action when data is insufficient', () => {
    render(<ExamPacePanel pace={{ ...pace, state: 'insufficient_data', newTopicsPerDay: null, reviewsPerDay: null, explanation: 'Dados insuficientes para estimar a meta.' }} activityDays={[]} onNavigate={vi.fn()} />);
    expect(screen.getByText('Dados insuficientes para estimar a meta.')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Definir|Atualizar|Carregar/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Detalhes do ritmo' }));
    expect(screen.getByText('Ainda não há registros na janela recente.')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('preserves sub-daily formatting and compares only categories with activity', () => {
    render(<ExamPacePanel pace={{ ...pace, newTopicsPerDay: 0.1, reviewsPerDay: 2 }} activityDays={[{ ...days[0], studiedCount: 0, reviewedCount: 1 }]} onNavigate={vi.fn()} />);
    expect(screen.getByText('a cada 10 dias')).toBeVisible();
    expect(screen.getByText('Média recente: 1,0/dia')).toBeVisible();
    expect(screen.getByText('Sua média ainda está abaixo da meta')).toBeVisible();
    expect(screen.getByText('Ainda sem histórico recente')).toBeVisible();
  });

  it('keeps calculated targets but does not present a failed activity query as an empty history', () => {
    const onRetryActivity = vi.fn().mockResolvedValue(undefined);
    render(<ExamPacePanel pace={pace} activityDays={[]} onNavigate={vi.fn()} isActivityUnavailable onRetryActivity={onRetryActivity} />);
    const panel = screen.getByRole('region', { name: 'Seu ritmo até a prova' });

    expect(within(panel).getAllByText('Média recente indisponível')).toHaveLength(2);
    expect(within(panel).queryByText('Ainda sem histórico recente')).not.toBeInTheDocument();
    expect(within(panel).getByText('2')).toBeVisible();
    expect(within(panel).getByText('1')).toBeVisible();

    expect(within(panel).getByText('Não foi possível atualizar a média recente')).toBeVisible();
    fireEvent.click(within(panel).getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetryActivity).toHaveBeenCalledOnce();
    fireEvent.click(within(panel).getByRole('button', { name: 'Detalhes do ritmo' }));
    expect(within(panel).getByText('A atividade recente não pôde ser atualizada.')).toBeVisible();
    expect(within(panel).queryByRole('img', { name: /Atividade recente/ })).not.toBeInTheDocument();
  });
});

describe('DashboardDataIssueNotice', () => {
  it('marks cached data and keeps retry disabled until the async attempt finishes', async () => {
    let finishRetry: (() => void) | undefined;
    const onRetry = vi.fn(() => new Promise<void>((resolve) => { finishRetry = resolve; }));
    render(
      <DashboardDataIssueNotice
        title="Dados indisponíveis"
        description="A consulta falhou."
        hasPreviousData
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText('Os dados exibidos abaixo podem estar desatualizados.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Tentando…' })).toBeDisabled();

    finishRetry?.();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeEnabled());
  });
});

describe('ProgressSummaryCard', () => {
  it('preserves current coverage and every count without treating started topics as completed', () => {
    const onNavigate = vi.fn();
    render(<ProgressSummaryCard summary={{
      startedTopics: 30, inProgressTopics: 24, completedTopics: 6, totalTopics: 82, editalProgressPercentage: 37,
    }} unstartedTopics={52} onNavigate={onNavigate} />);

    const region = screen.getByRole('region', { name: 'Progresso do edital' });
    expect(within(region).getByRole('img', { name: '37% do edital iniciado' })).toBeVisible();
    [['Iniciados', '30'], ['Em andamento', '24'], ['Não iniciados', '52'], ['Total de tópicos', '82']].forEach(([label, value]) => {
      expect(within(region).getByText(label).closest('div')).toHaveTextContent(value);
    });
    expect(within(region).queryByText(/concluído|dominado/i)).not.toBeInTheDocument();
    fireEvent.click(within(region).getByRole('button', { name: 'Ver progresso por matéria' }));
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('/ciclo-estudos');
  });

  it.each([0, 100])('keeps the supplied coverage at %i%% without estimating it from other counts', percentage => {
    render(<ProgressSummaryCard summary={{ ...missingCycleModel.progressSummary, editalProgressPercentage: percentage }} unstartedTopics={0} onNavigate={vi.fn()} />);
    expect(screen.getByRole('img', { name: `${percentage}% do edital iniciado` })).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Ver progresso por matéria' })).toHaveLength(1);
  });
});

describe('PriorityQueueCard', () => {
  const makeAction = (kind: DashboardAction['kind'], topicId: string): DashboardAction => ({
    ...missingCycleModel.nextBestAction,
    id: topicId,
    kind,
    title: `Tópico ${topicId}`,
    primaryHref: kind.startsWith('review_') ? `/revisoes?topicId=${topicId}` : '/ciclo-estudos',
    target: { subjectId: 'subject-1', topicId, subjectName: 'Direito Constitucional', topicName: `Tópico ${topicId}` },
  });

  it('preserves row order, counts and exact targets including review query parameters', () => {
    const onNavigate = vi.fn();
    const overdue = { ...makeAction('review_overdue', 'overdue'), metadata: { daysOverdue: 3 } };
    const today = makeAction('review_today', 'today');
    const cycle = makeAction('continue_cycle_topic', 'cycle');
    render(<PriorityQueueCard model={{
      ...missingCycleModel,
      nextBestAction: overdue,
      actionQueue: [today],
      continueCycleItems: [cycle],
      totals: { ...missingCycleModel.totals, overdueReviews: 4, todayReviews: 2, unstartedTopics: 8 },
    }} onNavigate={onNavigate} />);

    const rows = screen.getAllByRole('button').slice(1);
    ['Atrasadas (4)', 'Para hoje (2)', 'Ciclo de estudos (8)'].forEach((label, index) => {
      expect(rows[index]).toHaveTextContent(label);
      fireEvent.click(rows[index]);
    });
    expect(rows[0]).toHaveTextContent('Há 3 dias');
    [overdue, today, cycle].forEach((action, index) => {
      expect(onNavigate).toHaveBeenNthCalledWith(index + 1, action.primaryHref, action.target);
    });
    expect(onNavigate).toHaveBeenCalledTimes(3);
  });

  it('keeps the next recommended action ahead of other actions in the same category', () => {
    const onNavigate = vi.fn();
    const first = makeAction('review_today', 'first');
    const second = makeAction('review_today', 'second');
    render(<PriorityQueueCard model={{ ...missingCycleModel, nextBestAction: first, actionQueue: [second] }} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Para hoje/ }));
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith(first.primaryHref, first.target);
    expect(screen.queryByText('Tópico second')).not.toBeInTheDocument();
  });

  it('keeps empty-state shortcuts available and labels the header destination honestly', () => {
    const onNavigate = vi.fn();
    render(<PriorityQueueCard model={missingCycleModel} onNavigate={onNavigate} />);
    expect(screen.queryByRole('button', { name: 'Ver todas' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver revisões' }));
    expect(onNavigate).toHaveBeenLastCalledWith('/revisoes');

    const rows = screen.getAllByRole('button').slice(1);
    const destinations = ['/revisoes', '/revisoes', '/ciclo-estudos'];
    rows.forEach((row, index) => {
      expect(row).toBeEnabled();
      expect(row).toHaveTextContent('(0)');
      expect(row).not.toHaveClass('opacity-75');
      fireEvent.click(row);
      expect(onNavigate).toHaveBeenLastCalledWith(destinations[index], undefined);
    });
    expect(screen.getByText('Nenhuma revisão atrasada')).toBeVisible();
  });
});

describe('NextBestActionCard', () => {
  const action: DashboardAction = {
    id: 'review-topic-1',
    kind: 'review_overdue',
    tone: 'danger',
    title: 'Revisar Controle de constitucionalidade',
    description: 'Direito Constitucional • Revisão 2',
    reason: 'Este tópico está atrasado há 3 dias.',
    scientificBasis: 'A revisão espaçada orienta a ordem desta recomendação.',
    primaryLabel: 'Revisar agora',
    primaryHref: '/revisoes?topicId=topic-1',
    secondaryLabel: 'Abrir tópico',
    secondaryHref: '/revisoes?topicId=topic-1',
    target: { subjectName: 'Direito Constitucional', topicName: 'Controle de constitucionalidade' },
    priorityScore: 100,
  };

  it('removes only the duplicate destination and preserves the exact primary URL', () => {
    const onNavigate = vi.fn();
    render(<NextBestActionCard action={action} onNavigate={onNavigate} />);

    expect(screen.getByRole('heading', { name: 'Direito Constitucional' })).toBeVisible();
    expect(screen.getByText('Controle de constitucionalidade')).toBeVisible();
    expect(screen.getByText(action.reason)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Abrir tópico' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Revisar agora' }));
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith(action.primaryHref, action.target);
  });

  it('preserves a secondary action with a different destination', () => {
    const onNavigate = vi.fn();
    render(<NextBestActionCard action={{ ...action, secondaryLabel: 'Ver no ciclo', secondaryHref: '/ciclo-estudos' }} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ver no ciclo' }));
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('/ciclo-estudos', action.target);
    expect(screen.getByRole('button', { name: 'Revisar agora' })).toBeVisible();
  });

  it('preserves the action title when subject context has no topic name', () => {
    render(<NextBestActionCard action={{ ...action, target: { subjectName: 'Direito Constitucional' } }} onNavigate={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Direito Constitucional' })).toBeVisible();
    expect(screen.getByText(action.title)).toBeVisible();
  });

  it('toggles the complementary explanation without navigating or hiding the reason', () => {
    const onNavigate = vi.fn();
    render(<NextBestActionCard action={action} onNavigate={onNavigate} />);
    const trigger = screen.getByRole('button', { name: 'Como foi definida' });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(action.scientificBasis!)).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(action.scientificBasis!)).toBeVisible();
    expect(screen.getByText(action.reason)).toBeVisible();
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(action.scientificBasis!)).not.toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it.each([
    ['Enter', 'Enter'],
    ['Espaço', ' '],
  ])('opens the explanation with %s', (_label, key) => {
    render(<NextBestActionCard action={action} onNavigate={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Como foi definida' });

    trigger.focus();
    fireEvent.keyDown(trigger, { key });

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(action.scientificBasis!)).toBeVisible();
  });

  it.each([undefined, '', '   ', `  ${action.reason}  `])('omits absent or redundant details (%s)', scientificBasis => {
    render(<NextBestActionCard action={{ ...action, scientificBasis }} onNavigate={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Como foi definida' })).not.toBeInTheDocument();
    expect(screen.getByText(action.reason)).toBeVisible();
  });

  it('closes the explanation when the recommended action changes', () => {
    const { rerender } = render(<NextBestActionCard action={action} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Como foi definida' }));

    rerender(<NextBestActionCard action={{ ...action, id: 'review-topic-2', scientificBasis: 'Outro contexto de revisão.' }} onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Como foi definida' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Outro contexto de revisão.')).not.toBeInTheDocument();
  });

  it.each(['load_cycle', 'all_caught_up'] as const)('keeps the fallback action usable without a topic (%s)', kind => {
    const onNavigate = vi.fn();
    const fallback = { ...missingCycleModel.nextBestAction, kind };
    render(<NextBestActionCard action={fallback} onNavigate={onNavigate} />);

    expect(screen.getByRole('heading', { name: fallback.title })).toBeVisible();
    expect(screen.getByText(fallback.description)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: fallback.primaryLabel }));
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('/meus-editais', fallback.target);
    expect(within(screen.getByRole('region', { name: 'Melhor próxima ação' })).queryByText('Prioridade máxima')).not.toBeInTheDocument();
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

  it('does not present a failed reminder query as an empty list and offers a local retry', () => {
    const onRetry = vi.fn().mockResolvedValue(undefined);
    render(
      <RecentRemindersCard
        reminders={[]}
        onAddReminder={vi.fn()}
        onToggleReminder={vi.fn()}
        onDeleteReminder={vi.fn()}
        isAdding={false}
        isDeleting={false}
        isUnavailable
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText('Não foi possível carregar seus lembretes')).toBeVisible();
    expect(screen.queryByText('Sua lista está livre')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Texto do novo lembrete' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('shows cached reminders as stale and read-only after a refresh failure', () => {
    render(
      <RecentRemindersCard
        reminders={[{
          id: 'reminder-stale', href: '/revisoes', text: 'Revisar regimento', reminderDate: '2026-06-21',
          completed: false, createdAt: null, completedAt: null,
        }]}
        onAddReminder={vi.fn()}
        onToggleReminder={vi.fn()}
        onDeleteReminder={vi.fn()}
        isAdding={false}
        isDeleting={false}
        isUnavailable
      />,
    );

    expect(screen.getByText('Os dados exibidos abaixo podem estar desatualizados.')).toBeVisible();
    expect(screen.getByText('Revisar regimento')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: 'Concluir lembrete: Revisar regimento' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Excluir lembrete: Revisar regimento' })).toBeDisabled();
  });

  it('does not show creation or completion history in the expanded list', () => {
    render(
      <RecentRemindersCard
        reminders={[
          {
          id: 'reminder-1',
          href: '/revisoes',
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
          href: '/revisoes',
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
          href: '/revisoes',
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
