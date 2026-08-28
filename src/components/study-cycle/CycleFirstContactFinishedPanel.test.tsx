import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { StudyCycleTransitionSummary } from '@/utils/studyCycleTransitionSummary';
import { CycleFirstContactFinishedPanel } from './CycleFirstContactFinishedPanel';

const makeSummary = (overrides: Partial<StudyCycleTransitionSummary> = {}): StudyCycleTransitionSummary => ({
  averageMinutesPerStartedTopic: 46,
  completedSubjects: 0,
  completedTopics: 0,
  firstContactClosedSubjects: 2,
  hasNoNewTopicsToStart: false,
  isEditalCompleted: false,
  primaryAction: {
    kind: 'continue_cycle',
    label: 'Continuar ciclo',
    description: 'Ainda existem tópicos sem primeiro contato.',
    to: '/ciclo-estudos',
  },
  reviewCounts: {
    future: 4,
    overdue: 4,
    today: 0,
    unscheduled: 0,
  },
  startedTopics: 8,
  topSubjectByStudyMinutes: {
    minutes: 230,
    subjectId: 'subject-1',
    subjectName: 'Português',
  },
  totalStudyMinutes: 408,
  totalSubjects: 4,
  totalTopics: 10,
  unstartedTopics: 2,
  ...overrides,
});

describe('CycleFirstContactFinishedPanel', () => {
  it('offers a new cycle when the cycle round is complete even if the edital still has unstarted topics', () => {
    const onStartNextCycle = vi.fn();
    const onNavigate = vi.fn();

    render(
      <CycleFirstContactFinishedPanel
        cycleRoundComplete
        formatStudyMinutes={(minutes) => `${minutes} min`}
        onNavigate={onNavigate}
        onStartNextCycle={onStartNextCycle}
        summary={makeSummary()}
      />,
    );

    expect(screen.getByText('RODADA CONCLUÍDA')).toBeInTheDocument();
    expect(screen.getByText('Rodada finalizada com sucesso!')).toBeInTheDocument();
    expect(screen.getByText('4 de 4')).toBeInTheDocument();
    expect(screen.getByText('100% cumpridas')).toBeInTheDocument();
    expect(screen.getByText('8/10')).toBeInTheDocument();
    expect(screen.getByText('2 restantes para 1º contato')).toBeInTheDocument();
    expect(screen.getByText(/Português/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Iniciar próximo ciclo/i }));

    expect(onStartNextCycle).toHaveBeenCalledOnce();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('renders full first contact completed when all topics in the edital were started', () => {
    const onNavigate = vi.fn();

    render(
      <CycleFirstContactFinishedPanel
        cycleRoundComplete={false}
        formatStudyMinutes={(minutes) => `${minutes} min`}
        onNavigate={onNavigate}
        summary={makeSummary({
          hasNoNewTopicsToStart: true,
          unstartedTopics: 0,
          startedTopics: 10,
          primaryAction: {
            kind: 'overdue_reviews',
            label: 'Revisar atrasadas',
            description: 'Todos os tópicos já foram iniciados.',
            to: '/revisoes?tab=atrasadas',
          },
        })}
      />,
    );

    expect(screen.getByText('PRIMEIRO CONTATO FINALIZADO')).toBeInTheDocument();
    expect(screen.getByText('Todos os tópicos do edital foram iniciados!')).toBeInTheDocument();
    expect(screen.getByText('100% iniciados')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Revisar atrasadas/i }));
    expect(onNavigate).toHaveBeenCalledWith('/revisoes?tab=atrasadas');
  });

  it('hides the secondary review button when there are only future reviews', () => {
    render(
      <CycleFirstContactFinishedPanel
        cycleRoundComplete
        formatStudyMinutes={(minutes) => `${minutes} min`}
        onNavigate={vi.fn()}
        onStartNextCycle={vi.fn()}
        summary={makeSummary({
          reviewCounts: {
            future: 5,
            overdue: 0,
            today: 0,
            unscheduled: 0,
          },
        })}
      />,
    );

    expect(screen.queryByRole('button', { name: /Próximas revisões/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Revisar/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar próximo ciclo/i })).toBeInTheDocument();
  });
});

