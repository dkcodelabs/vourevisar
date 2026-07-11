import { useEffect } from 'react';

import type { Subject } from '@/types';
import { focusCycleSubject } from '@/utils/focusCycleSubject';

type CycleTopicFocusState = {
  focusSubjectId?: string;
  focusTopicId?: string;
} | null;

type UseCycleTopicFocusInput = {
  expandedSubjectList: Array<{ subject: Subject }>;
  locationState: CycleTopicFocusState;
  subjects: Subject[];
  setActiveTab: (tab: 'all') => void;
  setCycleExpandedSubjectIds: (subjectIds: string[]) => void;
  setHighlightedSubjectId: React.Dispatch<React.SetStateAction<string | null>>;
};

export function useCycleTopicFocus({
  expandedSubjectList,
  locationState,
  subjects,
  setActiveTab,
  setCycleExpandedSubjectIds,
  setHighlightedSubjectId,
}: UseCycleTopicFocusInput) {
  useEffect(() => {
    if (!locationState?.focusSubjectId) return;
    const focusedCycleSubjectId = locationState.focusTopicId
      ? expandedSubjectList.find(item =>
        item.subject.topics.some(topic => topic.id === locationState.focusTopicId)
      )?.subject.id
      : undefined;
    const focusSubjectId = focusedCycleSubjectId || locationState.focusSubjectId;

    if (!expandedSubjectList.some(item => item.subject.id === focusSubjectId) &&
      !subjects.some(subject => subject.id === focusSubjectId)) return;

    return focusCycleSubject({
      focusSubjectId,
      focusTopicId: locationState.focusTopicId,
      replaceHistoryState: true,
      setActiveTab,
      setCycleExpandedSubjectIds,
      setHighlightedSubjectId,
    });
  }, [expandedSubjectList, locationState, setActiveTab, setCycleExpandedSubjectIds, setHighlightedSubjectId, subjects]);
}
