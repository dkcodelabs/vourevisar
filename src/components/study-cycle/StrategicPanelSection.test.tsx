import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  strategicPanel: vi.fn((props: unknown) => <div data-testid="strategic-panel" data-props={JSON.stringify(Boolean(props))} />),
  scrollIntoView: vi.fn(),
}));

vi.mock('./StrategicEditalPanel', () => ({
  StrategicEditalPanel: (props: unknown) => mocks.strategicPanel(props),
}));

import { createRef } from 'react';

import { StrategicPanelSection } from './StrategicPanelSection';

describe('StrategicPanelSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = mocks.scrollIntoView;
  });

  it('renders the dock/title shell and forwards panel props', () => {
    render(
      <StrategicPanelSection
        cycleDisplayName="Ciclo Alfa"
        cycleEventInsights={[]}
        cycleMaturity={{
          phase: 'started',
          label: 'Em andamento',
          description: 'Base inicial',
          cycleNumber: 1,
          hasSavedCycleHistory: false,
        }}
        cycleTransitionSummary={{
          averageMinutesPerStartedTopic: null,
          completedSubjects: 0,
          completedTopics: 0,
          firstContactClosedSubjects: 0,
          hasNoNewTopicsToStart: false,
          isEditalCompleted: false,
          primaryAction: {
            description: 'Continuar ciclo',
            kind: 'continue_cycle',
            label: 'Continuar ciclo',
            to: '/ciclo-estudos',
          },
          reviewCounts: {
            future: 0,
            overdue: 0,
            today: 0,
            unscheduled: 0,
          },
          lowestSubjectByStudyMinutes: null,
          startedTopics: 0,
          topSubjectByStudyMinutes: null,
          totalStudyMinutes: 0,
          totalSubjects: 0,
          totalTopics: 0,
          unstartedTopics: 0,
        }}
        cycleVisualStats={{ daysToFinish: 5, totalSubjects: 0 }}
        editaisNoCiclo={[]}
        getUnifiedSubjectName={(id, fallback) => fallback}
        handleApplySuggestedQueueOrder={vi.fn()}
        handleStrategicAlertAction={vi.fn()}
        isResettingCycle={false}
        isStrategicDockVisible={true}
        localSubjects={[]}
        queueSuggestion={null}
        renderCycleTooltip={(content, trigger) => <span data-tooltip={String(content)}>{trigger}</span>}
        setResetCycleConfirmOpen={vi.fn()}
        strategicAlerts={[]}
        strategicDockLayout={{ left: 24, width: 320 }}
        strategicDockRef={createRef<HTMLAnchorElement>()}
        strategicPanelRef={createRef<HTMLElement>()}
        strategicPanelStats={{
          coveragePercentage: 0,
          highestPendingWeightSubject: null,
          startedSubjectsCount: 0,
          totalSubjects: 0,
        }}
        strategicPanelTitleRef={createRef<HTMLAnchorElement>()}
        userCycle={null}
      />,
    );

    expect(screen.getAllByText('Painel estratégico do edital')).toHaveLength(2);
    expect(screen.getByTestId('strategic-panel')).toBeInTheDocument();
    expect(mocks.strategicPanel).toHaveBeenCalledWith(expect.objectContaining({
      cycleDisplayName: 'Ciclo Alfa',
      queueSuggestion: null,
    }));

    fireEvent.click(screen.getAllByRole('link', { name: /Painel estratégico do edital/i })[0]);
    expect(mocks.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });
});
