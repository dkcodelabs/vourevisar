import { useMemo } from 'react';
import type { ExpandedSubjectItem } from '@/hooks/useCycleSubjectListState';

type FocusLocationState = {
    focusSubjectId?: string;
    focusTopicId?: string;
} | null;

export const useSubjectsFocusState = ({
    activeTimerTopicId,
    expandedSubjectList,
    locationState,
}: {
    activeTimerTopicId?: string;
    expandedSubjectList: ExpandedSubjectItem[];
    locationState: FocusLocationState;
}) => {
    const activeTimerFocusedSubjectId = useMemo(() => {
        if (!activeTimerTopicId) return null;
        return expandedSubjectList.find(item => item.subject.topics.some(topic => topic.id === activeTimerTopicId))?.subject.id || null;
    }, [activeTimerTopicId, expandedSubjectList]);

    const navigationFocusedSubjectId = useMemo(() => {
        if (!locationState?.focusTopicId) return locationState?.focusSubjectId || null;
        return expandedSubjectList.find(item => item.subject.topics.some(topic => topic.id === locationState.focusTopicId))?.subject.id || locationState.focusSubjectId || null;
    }, [expandedSubjectList, locationState]);

    const preserveExpandedSubjectIdSet = useMemo(() => {
        const ids = new Set<string>();
        if (navigationFocusedSubjectId) ids.add(navigationFocusedSubjectId);
        if (activeTimerFocusedSubjectId) ids.add(activeTimerFocusedSubjectId);
        return ids;
    }, [activeTimerFocusedSubjectId, navigationFocusedSubjectId]);

    return { activeTimerFocusedSubjectId, navigationFocusedSubjectId, preserveExpandedSubjectIdSet };
};
