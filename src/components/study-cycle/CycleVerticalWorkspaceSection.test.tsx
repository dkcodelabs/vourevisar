import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import type { Subject, Topic } from '@/types';

const mocks = vi.hoisted(() => ({
  verticalEditalSummary: vi.fn((props: unknown) => <div data-testid="vertical-summary" data-props={JSON.stringify(Boolean(props))} />),
  verticalEditalView: vi.fn((props: unknown) => <div data-testid="vertical-view" data-props={JSON.stringify(Boolean(props))} />),
  subjectWeightRenderer: vi.fn((props: unknown) => <div data-testid="weight-renderer" data-props={JSON.stringify(Boolean(props))} />),
}));

vi.mock('./VerticalEditalSummary', () => ({
  VerticalEditalSummary: (props: unknown) => mocks.verticalEditalSummary(props),
}));

vi.mock('./VerticalEditalView', () => ({
  VerticalEditalView: (props: unknown) => mocks.verticalEditalView(props),
}));

vi.mock('./CycleSubjectWeightRenderer', () => ({
  CycleSubjectWeightRenderer: (props: unknown) => mocks.subjectWeightRenderer(props),
}));

import { CycleVerticalWorkspaceSection } from './CycleVerticalWorkspaceSection';

const topic = {
  id: 'topic-1',
  name: 'Controle de Constitucionalidade',
  subject_id: 'subject-1',
  is_active: true,
} as Topic;

const subject = {
  id: 'subject-1',
  name: 'Direito Constitucional',
  topics: [topic],
} as Subject;

describe('CycleVerticalWorkspaceSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('composes the summary and the vertical view with timer-aware topic status', () => {
    render(
      <CycleVerticalWorkspaceSection
        activeTimer={{ topicId: 'topic-1', status: 'PAUSED' }}
        clearSavedWeight={vi.fn()}
        cycleMetrics={null}
        cycleSearchQuery="constitucional"
        editingWeightSubjectId="subject-1"
        expandedSubjectIds={['subject-1']}
        getCycleTopicStatusVisual={() => ({
          label: 'Iniciado',
          badgeClassName: 'bg-primary/10 text-primary',
          indicatorClassName: 'bg-primary',
          actionClassName: 'text-primary',
        })}
        getStartedTopicCta={() => ({
          ariaLabel: 'Continuar',
          label: 'Continuar',
          tooltip: 'Continuar estudo',
        })}
        getStrategicTopicIncidenceDisplay={() => null}
        getStrategicTopicIncidenceTitle={() => 'Sem destaque'}
        getSubjectTopicSummaryLabel={() => '1/1 tópicos iniciados'}
        getTopicContactCount={() => 1}
        getUnifiedSubjectName={() => 'Direito Constitucional'}
        handleCancelWeightEdit={vi.fn()}
        handleSaveSubjectWeightInline={vi.fn()}
        handleStartWeightEdit={vi.fn()}
        isSavingWeight={false}
        isTopicCompleted={() => false}
        isTopicNewlyStartedInCycle={() => true}
        isTopicStarted={() => true}
        onGoToReview={vi.fn()}
        onOpenReviews={vi.fn()}
        onOpenTopicNotes={vi.fn()}
        onStudyAction={vi.fn()}
        setWeightDraft={vi.fn()}
        subjects={[{ id: subject.id, subject, topics: [topic] }]}
        summaryEdital={null}
        weightDraft={{ questions: '10', points: '', percentage: '' }}
        weightSavedSubjectId={null}
      />,
    );

    expect(screen.getByTestId('vertical-summary')).toBeInTheDocument();
    expect(screen.getByTestId('vertical-view')).toBeInTheDocument();

    expect(mocks.verticalEditalSummary).toHaveBeenCalledWith(expect.objectContaining({
      edital: null,
      metrics: null,
    }));

    const verticalViewProps = mocks.verticalEditalView.mock.calls[0][0] as {
      getTopicStudySessionStatus: (topicId: string) => 'RUNNING' | 'PAUSED' | null;
      isWeightLineActive: (subjectId: string) => boolean;
      renderSubjectWeightControl: (currentSubject: Subject) => unknown;
    };

    expect(verticalViewProps.getTopicStudySessionStatus('topic-1')).toBe('PAUSED');
    expect(verticalViewProps.getTopicStudySessionStatus('topic-2')).toBeNull();
    expect(verticalViewProps.isWeightLineActive('subject-1')).toBe(true);
    expect(verticalViewProps.isWeightLineActive('subject-2')).toBe(false);

    render(<>{verticalViewProps.renderSubjectWeightControl(subject)}</>);
    expect(mocks.subjectWeightRenderer).toHaveBeenCalledWith(expect.objectContaining({
      editingWeightSubjectId: 'subject-1',
      subject,
      weightSavedSubjectId: null,
    }));
  });
});
