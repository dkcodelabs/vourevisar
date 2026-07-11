import { useMemo, useState } from 'react';

import type { ExpandedSubjectItem } from './useCycleSubjectListState';

type UserCycleLike = {
  ciclo_atual?: string[] | null;
  name?: string | null;
} | null | undefined;

type UseCycleQueueDisplayStateInput = {
  cycleClosedSubjectIdSet: Set<string>;
  expandedSubjectList: ExpandedSubjectItem[];
  filteredList: ExpandedSubjectItem[];
  userCycle: UserCycleLike;
};

const ITEMS_PER_PAGE = 25;

export function useCycleQueueDisplayState({
  cycleClosedSubjectIdSet,
  expandedSubjectList,
  filteredList,
  userCycle,
}: UseCycleQueueDisplayStateInput) {
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const isCycleFullyStudied = expandedSubjectList.length > 0 &&
    expandedSubjectList.every(item => cycleClosedSubjectIdSet.has(item.subject.id));

  const orderedCycleDisplayList = useMemo(() => {
    const pending: ExpandedSubjectItem[] = [];
    const studied: ExpandedSubjectItem[] = [];

    filteredList.forEach(item => {
      if (cycleClosedSubjectIdSet.has(item.subject.id)) {
        studied.push(item);
      } else {
        pending.push(item);
      }
    });

    return [...pending, ...studied];
  }, [cycleClosedSubjectIdSet, filteredList]);

  const displayList = useMemo(
    () => orderedCycleDisplayList.slice(0, visibleCount),
    [orderedCycleDisplayList, visibleCount],
  );

  const totalDisplayItems = orderedCycleDisplayList.length;
  const hasMore = totalDisplayItems > visibleCount;
  const hasActiveCycle = Boolean(userCycle?.ciclo_atual?.length);
  const hasCycleSubjects = expandedSubjectList.length > 0;
  const showCycleWorkspace = hasActiveCycle && hasCycleSubjects;
  const cycleDisplayName = typeof userCycle?.name === 'string' && userCycle.name.trim()
    ? userCycle.name.trim()
    : null;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  return {
    cycleDisplayName,
    displayList,
    handleLoadMore,
    hasActiveCycle,
    hasMore,
    isCycleFullyStudied,
    orderedCycleDisplayList,
    showCycleWorkspace,
    totalDisplayItems,
    visibleCount,
  };
}
