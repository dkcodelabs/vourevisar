import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { ReactElement, ReactNode } from 'react';

import type { Subject, Topic } from '@/types';
import { getStudyCycleSubjectActionState } from '@/utils/studyCycleSubjectState';
import { getVisibleCycleTopics, isVisibleCycleTopic } from '@/utils/studyCycleTopicVisibility';
import { sortTopicsInStudyOrder } from '@/utils/topicOrder';

import { CycleSubjectCard } from '@/components/study-cycle/CycleSubjectCard';
import { CycleSubjectWeightRenderer } from '@/components/study-cycle/CycleSubjectWeightRenderer';
import { CycleTopicRow } from '@/components/study-cycle/CycleTopicRow';

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

type DisplayListItem = {
  id: string;
  subject: Subject;
};

type MergeInfo = {
  id: string;
  display_name: string;
  primary_subject_id: string;
  merged_subject_ids?: string[] | null;
} | null;

type CycleQueueListProps = {
  activeTab: 'all' | 'vertical';
  activeTimer: { topicId: string; status: 'RUNNING' | 'PAUSED' } | null;
  clearSavedWeight: () => void;
  completedEditalSubjectIdSet: Set<string>;
  displayList: DisplayListItem[];
  editingWeightSubjectId: string | null;
  expandedSubjectIds: string[];
  fullyStartedSubjectIdSet: Set<string>;
  getCycleTopicStatusVisual: (topic: Topic, hasStarted: boolean) => CycleTopicStatusVisual;
  getStartedTopicCta: (topicName: string) => StartedTopicCta;
  getSubjectMergeInfo: (subjectId: string) => MergeInfo;
  getTopicContactCount: (topic: Topic) => number;
  getUnifiedSubjectName: (subjectId: string, fallbackName: string) => string;
  handleCancelWeightEdit: () => void;
  handleManageSubject: (subject: Subject) => void;
  handleMarkStudied: (subjectId: string) => void;
  highlightedSubjectId: string | null;
  handleOpenNotes: (subject: Subject, topic: Topic) => void;
  handleOpenRevertMerge: (subject: Subject, mergeInfo: NonNullable<MergeInfo>) => void;
  handleReturnToQueue: (subjectId: string) => void;
  handleSaveSubjectWeightInline: (subjectId: string) => void;
  handleStartWeightEdit: (subject: Subject) => void;
  handleStudyAction: (topicId: string) => void;
  isReorderingCycle: boolean;
  isSavingWeight: boolean;
  isSubjectMerged: (subjectId: string) => boolean;
  isTopicCompleted: (topic: Topic) => boolean;
  isTopicNewlyStartedInCycle: (topic: Topic) => boolean;
  isTopicStarted: (topic: Topic) => boolean;
  onGoToReview: (topicId: string) => void;
  renderCycleTooltip: (
    content: ReactNode,
    trigger: ReactElement,
    side?: 'top' | 'right' | 'bottom' | 'left'
  ) => ReactNode;
  setWeightDraft: (updater: (draft: WeightDraft) => WeightDraft) => WeightDraft | void;
  studiedCycleIdSet: Set<string>;
  toggleExpand: (itemId: string) => void;
  weightDraft: WeightDraft;
  weightSavedSubjectId: string | null;
};

export function CycleQueueList({
  activeTab,
  activeTimer,
  clearSavedWeight,
  completedEditalSubjectIdSet,
  displayList,
  editingWeightSubjectId,
  expandedSubjectIds,
  fullyStartedSubjectIdSet,
  getCycleTopicStatusVisual,
  getStartedTopicCta,
  getSubjectMergeInfo,
  getTopicContactCount,
  getUnifiedSubjectName,
  handleCancelWeightEdit,
  handleManageSubject,
  handleMarkStudied,
  highlightedSubjectId,
  handleOpenNotes,
  handleOpenRevertMerge,
  handleReturnToQueue,
  handleSaveSubjectWeightInline,
  handleStartWeightEdit,
  handleStudyAction,
  isReorderingCycle,
  isSavingWeight,
  isSubjectMerged,
  isTopicCompleted,
  isTopicNewlyStartedInCycle,
  isTopicStarted,
  onGoToReview,
  renderCycleTooltip,
  setWeightDraft,
  studiedCycleIdSet,
  toggleExpand,
  weightDraft,
  weightSavedSubjectId,
}: CycleQueueListProps) {
  return (
    <SortableContext items={displayList.map((item) => item.id)} strategy={verticalListSortingStrategy}>
      <div className={activeTab === 'all' ? 'flex flex-col gap-1.5' : 'space-y-1.5'}>
        {displayList.map((item) => {
          const { subject } = item;
          const isManuallyStudiedInCycle = studiedCycleIdSet.has(subject.id);
          const isFullyStartedInCycle = fullyStartedSubjectIdSet.has(subject.id);
          const isCompletedInEdital = completedEditalSubjectIdSet.has(subject.id);
          const hasCompletionVisual = isManuallyStudiedInCycle || isCompletedInEdital;
          const isClosedInCycle = hasCompletionVisual || isFullyStartedInCycle;
          const activeSubjectTopics = sortTopicsInStudyOrder(getVisibleCycleTopics(subject.topics));
          const totalTopicsCount = activeSubjectTopics.length;
          const completedTopicsCount = activeSubjectTopics.filter(isTopicCompleted).length;
          const inReviewTopicsCount = activeSubjectTopics.filter((topic) =>
            isTopicStarted(topic) && !isTopicCompleted(topic),
          ).length;
          const startedTopicsCount = inReviewTopicsCount + completedTopicsCount;
          const activeTopicsStartedInCurrentCycle = subject.topics.filter((topic) =>
            isVisibleCycleTopic(topic) && isTopicNewlyStartedInCycle(topic),
          ).length;
          const needsCycleClosure = activeTopicsStartedInCurrentCycle > 0 && !isClosedInCycle;
          const subjectActionState = getStudyCycleSubjectActionState({
            isCompletedInEdital,
            isFullyStartedInCycle,
            isManuallyStudiedInCycle,
            needsCycleClosure,
          });
          const subjectTopicSummaryLabel = (() => {
            if (totalTopicsCount === 0) return '0 tópicos';
            if (isCompletedInEdital) return `${completedTopicsCount}/${totalTopicsCount} tópicos concluídos`;
            if (isManuallyStudiedInCycle) {
              return activeTopicsStartedInCurrentCycle > 0
                ? `${activeTopicsStartedInCurrentCycle}/${totalTopicsCount} tópicos neste ciclo`
                : 'Concluída no ciclo';
            }
            if (isFullyStartedInCycle) return `${startedTopicsCount}/${totalTopicsCount} tópicos iniciados - seguir para revisão`;
            return `${startedTopicsCount}/${totalTopicsCount} tópicos iniciados`;
          })();

          const isWeightLineActive = editingWeightSubjectId === subject.id || weightSavedSubjectId === subject.id;
          const subjectDisplayName = getUnifiedSubjectName(subject.id, subject.name);
          const subjectWeightControl = (
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
          );

          const handleOpenRevert = () => {
            const mergeInfo = getSubjectMergeInfo(subject.id);
            if (!mergeInfo) return;
            handleOpenRevertMerge(subject, mergeInfo);
          };

          return (
            <CycleSubjectCard
              key={item.id}
              activeTab={activeTab}
              hasTopics={activeSubjectTopics.length > 0}
              isClosedInCycle={hasCompletionVisual}
              isCompletedInEdital={isCompletedInEdital}
              isExpanded={expandedSubjectIds.includes(item.id)}
              isHighlighted={highlightedSubjectId === subject.id}
              isMerged={isSubjectMerged(subject.id)}
              isReorderingCycle={isReorderingCycle}
              isWeightLineActive={isWeightLineActive}
              itemId={item.id}
              needsCycleClosure={needsCycleClosure}
              onManageSubject={() => handleManageSubject(subject)}
              onMarkStudied={() => handleMarkStudied(subject.id)}
              onOpenRevertMerge={handleOpenRevert}
              onReturnToQueue={() => handleReturnToQueue(subject.id)}
              onToggleExpand={() => toggleExpand(item.id)}
              renderCycleTooltip={renderCycleTooltip}
              subject={subject}
              subjectActionState={subjectActionState}
              subjectDisplayName={subjectDisplayName}
              subjectTopicSummaryLabel={subjectTopicSummaryLabel}
              weightControl={subjectWeightControl}
            >
              <div className="flex flex-col">
                {activeSubjectTopics.map((topic) => {
                  const completed = isTopicCompleted(topic);
                  const contactCount = getTopicContactCount(topic);
                  const hasStarted = contactCount > 0 || isTopicStarted(topic);
                  const studiedInCurrentCycle = isTopicNewlyStartedInCycle(topic);
                  const statusVisual = getCycleTopicStatusVisual(topic, hasStarted);

                  return (
                    <CycleTopicRow
                      activeStudySessionStatus={activeTimer?.topicId === topic.id ? activeTimer.status : null}
                      key={topic.id}
                      completed={completed}
                      hasStarted={hasStarted}
                      onGoToReview={() => onGoToReview(topic.id)}
                      onOpenNotes={() => handleOpenNotes(subject, topic)}
                      onStudyAction={() => handleStudyAction(topic.id)}
                      renderCycleTooltip={renderCycleTooltip}
                      startedTopicCta={getStartedTopicCta(topic.name)}
                      statusLabel={`Tópico ${statusVisual.label.toLowerCase()}`}
                      statusVisual={statusVisual}
                      studiedInCurrentCycle={studiedInCurrentCycle}
                      topic={topic}
                    />
                  );
                })}
              </div>
            </CycleSubjectCard>
          );
        })}
      </div>
    </SortableContext>
  );
}
