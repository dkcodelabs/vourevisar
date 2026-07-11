import type { ComponentProps } from 'react';

import type { Subject, Topic } from '@/types';

import { CycleSubjectWeightRenderer } from '@/components/study-cycle/CycleSubjectWeightRenderer';
import { renderCycleTooltip } from '@/components/study-cycle/CycleTooltip';
import { VerticalEditalSummary } from '@/components/study-cycle/VerticalEditalSummary';
import { VerticalEditalView } from '@/components/study-cycle/VerticalEditalView';

type CycleTopicStatusVisual = {
  label: string;
  badgeClassName: string;
  indicatorClassName: string;
  actionClassName: string;
};

type StartedTopicCta = {
  tooltip: string;
  ariaLabel: string;
  label: string;
};

type WeightDraft = {
  questions: string;
  points: string;
  percentage: string;
};

type ActiveTimerSummary = {
  topicId: string;
  status: 'RUNNING' | 'PAUSED';
} | null;

type CycleVerticalWorkspaceSectionProps = {
  activeTimer: ActiveTimerSummary;
  clearSavedWeight: () => void;
  cycleMetrics: ComponentProps<typeof VerticalEditalSummary>['metrics'];
  cycleSearchQuery: string;
  editingWeightSubjectId: string | null;
  expandedSubjectIds: string[];
  getCycleTopicStatusVisual: (topic: Topic, hasStarted: boolean) => CycleTopicStatusVisual;
  getStartedTopicCta: (topicName: string) => StartedTopicCta;
  getStrategicTopicIncidenceDisplay: (topic: Topic) => string | null;
  getStrategicTopicIncidenceTitle: (topic: Topic) => string;
  getSubjectTopicSummaryLabel: ComponentProps<typeof VerticalEditalView>['getSubjectTopicSummaryLabel'];
  getTopicContactCount: (topic: Topic) => number;
  getUnifiedSubjectName: (subjectId: string, fallbackName: string) => string;
  handleCancelWeightEdit: () => void;
  handleSaveSubjectWeightInline: (subjectId: string) => void;
  handleStartWeightEdit: (subject: Subject) => void;
  isSavingWeight: boolean;
  isTopicCompleted: (topic: Topic) => boolean;
  isTopicNewlyStartedInCycle: (topic: Topic) => boolean;
  isTopicStarted: (topic: Topic) => boolean;
  onGoToReview: (topicId: string) => void;
  onOpenReviews: () => void;
  onOpenTopicNotes: (subjectId: string, topicId: string) => void;
  onStudyAction: (topicId: string) => void;
  setWeightDraft: ComponentProps<typeof CycleSubjectWeightRenderer>['setWeightDraft'];
  subjects: ComponentProps<typeof VerticalEditalView>['subjects'];
  summaryEdital: ComponentProps<typeof VerticalEditalSummary>['edital'];
  weightDraft: WeightDraft;
  weightSavedSubjectId: string | null;
};

const getVerticalTopicStatus = (
  topic: Topic,
  hasStarted: boolean,
  getCycleTopicStatusVisual: (topic: Topic, hasStarted: boolean) => CycleTopicStatusVisual,
) => {
  const statusVisual = getCycleTopicStatusVisual(topic, hasStarted);
  return {
    className: statusVisual.badgeClassName,
    label: statusVisual.label,
  };
};

export function CycleVerticalWorkspaceSection({
  activeTimer,
  clearSavedWeight,
  cycleMetrics,
  cycleSearchQuery,
  editingWeightSubjectId,
  expandedSubjectIds,
  getCycleTopicStatusVisual,
  getStartedTopicCta,
  getStrategicTopicIncidenceDisplay,
  getStrategicTopicIncidenceTitle,
  getSubjectTopicSummaryLabel,
  getTopicContactCount,
  getUnifiedSubjectName,
  handleCancelWeightEdit,
  handleSaveSubjectWeightInline,
  handleStartWeightEdit,
  isSavingWeight,
  isTopicCompleted,
  isTopicNewlyStartedInCycle,
  isTopicStarted,
  onGoToReview,
  onOpenReviews,
  onOpenTopicNotes,
  onStudyAction,
  setWeightDraft,
  subjects,
  summaryEdital,
  weightDraft,
  weightSavedSubjectId,
}: CycleVerticalWorkspaceSectionProps) {
  return (
    <>
      <VerticalEditalSummary
        edital={summaryEdital}
        metrics={cycleMetrics}
        onOpenReviews={onOpenReviews}
      />
      <VerticalEditalView
        emptySearchQuery={cycleSearchQuery}
        expandedSubjectIds={expandedSubjectIds}
        getCycleTopicStatusVisual={getCycleTopicStatusVisual}
        getStartedTopicCta={getStartedTopicCta}
        getStrategicTopicIncidenceDisplay={getStrategicTopicIncidenceDisplay}
        getStrategicTopicIncidenceTitle={getStrategicTopicIncidenceTitle}
        getSubjectTopicSummaryLabel={getSubjectTopicSummaryLabel}
        getTopicContactCount={getTopicContactCount}
        getTopicStudySessionStatus={(topicId) => activeTimer?.topicId === topicId ? activeTimer.status : null}
        getUnifiedSubjectName={getUnifiedSubjectName}
        getVerticalTopicStatus={(topic, hasStarted) => getVerticalTopicStatus(topic, hasStarted, getCycleTopicStatusVisual)}
        isTopicCompleted={isTopicCompleted}
        isTopicNewlyStartedInCycle={isTopicNewlyStartedInCycle}
        isTopicStarted={isTopicStarted}
        isWeightLineActive={(subjectId) => editingWeightSubjectId === subjectId || weightSavedSubjectId === subjectId}
        onGoToReview={onGoToReview}
        onOpenTopicNotes={onOpenTopicNotes}
        onStudyAction={onStudyAction}
        renderCycleTooltip={renderCycleTooltip}
        renderSubjectWeightControl={(subject) => (
          <CycleSubjectWeightRenderer
            clearSavedWeight={clearSavedWeight}
            editingWeightSubjectId={editingWeightSubjectId}
            handleCancelWeightEdit={handleCancelWeightEdit}
            handleSaveSubjectWeightInline={handleSaveSubjectWeightInline}
            handleStartWeightEdit={handleStartWeightEdit}
            isSavingWeight={isSavingWeight}
            setWeightDraft={setWeightDraft}
            subject={subject}
            weightDraft={weightDraft}
            weightSavedSubjectId={weightSavedSubjectId}
          />
        )}
        subjects={subjects}
        summary={null}
      />
    </>
  );
}
