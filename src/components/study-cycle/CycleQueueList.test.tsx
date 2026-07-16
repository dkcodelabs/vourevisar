import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Subject, Topic } from '@/types';

const mocks = vi.hoisted(() => ({
  cycleSubjectCard: vi.fn((props: { children?: React.ReactNode }) => <div data-testid="subject-card">{props.children}</div>),
  cycleTopicRow: vi.fn((props: unknown) => <div data-testid="topic-row" data-props={JSON.stringify(Boolean(props))} />),
}));

vi.mock('./CycleSubjectCard', () => ({
  CycleSubjectCard: (props: unknown) => mocks.cycleSubjectCard(props),
}));

vi.mock('./CycleTopicRow', () => ({
  CycleTopicRow: (props: unknown) => mocks.cycleTopicRow(props),
}));

import { CycleQueueList } from './CycleQueueList';

const topic = {
  id: 'topic-1',
  name: 'controle de constitucionalidade',
  subject_id: 'subject-1',
  is_active: true,
} as Topic;

const subject = {
  id: 'subject-1',
  name: 'direito constitucional',
  topics: [topic],
  edital_id: 'edital-1',
} as Subject;

describe('CycleQueueList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders cycle subjects and forwards topic/session callbacks', () => {
    const handleStudyAction = vi.fn();
    const handleManageSubject = vi.fn();
    const handleOpenRevertMerge = vi.fn();
    const handleMarkStudied = vi.fn();
    const handleReturnToQueue = vi.fn();
    const handleOpenNotes = vi.fn();

    render(
      <CycleQueueList
        activeTab="all"
        activeTimer={{ topicId: 'topic-1', status: 'PAUSED' }}
        clearSavedWeight={vi.fn()}
        completedEditalSubjectIdSet={new Set()}
        displayList={[{ id: 'subject-1-cycle-0', subject }]}
        editingWeightSubjectId={null}
        expandedSubjectIds={['subject-1-cycle-0']}
        fullyStartedSubjectIdSet={new Set()}
        getCycleTopicStatusVisual={() => ({
          label: 'Iniciado',
          badgeClassName: 'bg-primary/10 text-primary',
          indicatorClassName: 'bg-primary',
          actionClassName: 'text-primary',
        })}
        getStartedTopicCta={() => ({
          tooltip: 'Continuar estudo',
          ariaLabel: 'Continuar revisão do tópico',
          label: 'Continuar',
        })}
        getStrategicTopicIncidenceDisplay={() => null}
        getStrategicTopicIncidenceTitle={() => 'Sem destaque'}
        getSubjectMergeInfo={() => null}
        getTopicContactCount={() => 1}
        getUnifiedSubjectName={() => 'Direito Constitucional'}
        handleCancelWeightEdit={vi.fn()}
        handleManageSubject={handleManageSubject}
        handleMarkStudied={handleMarkStudied}
        highlightedSubjectId="subject-1"
        handleOpenNotes={handleOpenNotes}
        handleOpenRevertMerge={handleOpenRevertMerge}
        handleReturnToQueue={handleReturnToQueue}
        handleSaveSubjectWeightInline={vi.fn()}
        handleStartWeightEdit={vi.fn()}
        handleStudyAction={handleStudyAction}
        isReorderingCycle={false}
        isSavingWeight={false}
        isSubjectMerged={() => false}
        isTopicCompleted={() => false}
        isTopicNewlyStartedInCycle={() => true}
        isTopicStarted={() => true}
        onGoToReview={vi.fn()}
        renderCycleTooltip={(content, trigger) => <span data-tooltip={String(content)}>{trigger}</span>}
        setWeightDraft={vi.fn()}
        studiedCycleIdSet={new Set()}
        toggleExpand={vi.fn()}
        weightDraft={{ questions: '', points: '', percentage: '' }}
        weightSavedSubjectId={null}
      />,
    );

    expect(screen.getByTestId('subject-card')).toBeInTheDocument();
    expect(screen.getByTestId('topic-row')).toBeInTheDocument();

    expect(mocks.cycleSubjectCard).toHaveBeenCalledWith(expect.objectContaining({
      isHighlighted: true,
      isExpanded: true,
      subjectDisplayName: 'Direito Constitucional',
      subjectTopicSummaryLabel: '1/1 tópicos iniciados',
    }));

    expect(mocks.cycleTopicRow).toHaveBeenCalledWith(expect.objectContaining({
      activeStudySessionStatus: 'PAUSED',
      hasStarted: true,
      studiedInCurrentCycle: true,
      topic,
    }));
  });

  it('does not show a fully started subject as visually completed', () => {
    render(
      <CycleQueueList
        activeTab="all"
        activeTimer={null}
        clearSavedWeight={vi.fn()}
        completedEditalSubjectIdSet={new Set()}
        displayList={[{ id: 'subject-1-cycle-0', subject }]}
        editingWeightSubjectId={null}
        expandedSubjectIds={[]}
        fullyStartedSubjectIdSet={new Set(['subject-1'])}
        getCycleTopicStatusVisual={() => ({
          label: 'Iniciado',
          badgeClassName: 'bg-primary/10 text-primary',
          indicatorClassName: 'bg-primary',
          actionClassName: 'text-primary',
        })}
        getStartedTopicCta={() => ({
          tooltip: 'Ir para revisão',
          ariaLabel: 'Ir para revisão do tópico',
          label: 'Ir para Revisão',
        })}
        getStrategicTopicIncidenceDisplay={() => null}
        getStrategicTopicIncidenceTitle={() => 'Sem destaque'}
        getSubjectMergeInfo={() => null}
        getTopicContactCount={() => 1}
        getUnifiedSubjectName={() => 'Matemática'}
        handleCancelWeightEdit={vi.fn()}
        handleManageSubject={vi.fn()}
        handleMarkStudied={vi.fn()}
        highlightedSubjectId={null}
        handleOpenNotes={vi.fn()}
        handleOpenRevertMerge={vi.fn()}
        handleReturnToQueue={vi.fn()}
        handleSaveSubjectWeightInline={vi.fn()}
        handleStartWeightEdit={vi.fn()}
        handleStudyAction={vi.fn()}
        isReorderingCycle={false}
        isSavingWeight={false}
        isSubjectMerged={() => false}
        isTopicCompleted={() => false}
        isTopicNewlyStartedInCycle={() => true}
        isTopicStarted={() => true}
        onGoToReview={vi.fn()}
        renderCycleTooltip={(content, trigger) => <span data-tooltip={String(content)}>{trigger}</span>}
        setWeightDraft={vi.fn()}
        studiedCycleIdSet={new Set()}
        toggleExpand={vi.fn()}
        weightDraft={{ questions: '', points: '', percentage: '' }}
        weightSavedSubjectId={null}
      />,
    );

    expect(mocks.cycleSubjectCard).toHaveBeenCalledWith(expect.objectContaining({
      isClosedInCycle: false,
      subjectActionState: expect.objectContaining({ kind: 'locked_started' }),
      subjectTopicSummaryLabel: '1/1 tópicos iniciados - seguir para revisão',
    }));
  });
});
