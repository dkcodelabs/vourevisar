import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  strategicPanel: vi.fn(() => <div data-testid="strategic-panel" />),
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
          hasNoNewTopicsToStart: false,
          isEditalCompleted: false,
        }}
        cycleVisualStats={{ daysToFinish: 5 }}
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
          highestIncidenceSubject: null,
          highestIncidenceTopic: null,
          highestPendingWeightSubject: null,
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
