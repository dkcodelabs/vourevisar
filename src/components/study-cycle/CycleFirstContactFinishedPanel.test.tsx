import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { StudyCycleTransitionSummary } from '@/utils/studyCycleTransitionSummary';
import { CycleFirstContactFinishedPanel } from './CycleFirstContactFinishedPanel';

const makeSummary = (): StudyCycleTransitionSummary => ({
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

    expect(screen.getByText('Ciclo encerrado. Próxima rodada pronta')).toBeInTheDocument();
    expect(screen.getByText(/2\/4 matérias fechadas nesta rodada/)).toBeInTheDocument();
    expect(screen.queryByText('Ainda existem tópicos sem primeiro contato.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Novo ciclo/i }));

    expect(onStartNextCycle).toHaveBeenCalledOnce();
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
