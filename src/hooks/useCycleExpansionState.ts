import { useEffect, useMemo, useRef, useState } from 'react';

type SubjectTab = 'all' | 'vertical';

type ExpandedSubjectListItem = {
  id: string;
};

type UseCycleExpansionStateInput = {
  activeTab: SubjectTab;
  cycleClosedSubjectIdSet: Set<string>;
  dataLoaded: boolean;
  expandedSubjectList: ExpandedSubjectListItem[];
  preserveExpandedSubjectIdSet?: Set<string>;
  userId?: string | null;
};

const readExpandedSubjectIds = (storageKey: string) => {
  try {
    const storedValue = localStorage.getItem(storageKey);
    const storedIds = storedValue ? JSON.parse(storedValue) : [];
    return Array.isArray(storedIds) ? storedIds.filter(id => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

const areArraysEqual = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const EMPTY_SUBJECT_ID_SET = new Set<string>();

export function useCycleExpansionState({
  activeTab,
  cycleClosedSubjectIdSet,
  dataLoaded,
  expandedSubjectList,
  preserveExpandedSubjectIdSet = EMPTY_SUBJECT_ID_SET,
  userId,
}: UseCycleExpansionStateInput) {
  const [cycleExpandedSubjectIds, setCycleExpandedSubjectIds] = useState<string[]>([]);
  const [verticalExpandedSubjectIds, setVerticalExpandedSubjectIds] = useState<string[]>([]);
  const [highlightedSubjectId, setHighlightedSubjectId] = useState<string | null>(null);
  const loadedCycleExpansionKeyRef = useRef<string | null>(null);
  const [hydratedCycleExpansionKey, setHydratedCycleExpansionKey] = useState<string | null>(null);

  const cycleExpansionStorageKey = userId ? `study_cycle_expanded_subjects_${userId}` : null;
  const expandedSubjectIds = activeTab === 'vertical'
    ? verticalExpandedSubjectIds
    : cycleExpandedSubjectIds;

  const validCycleSubjectIds = useMemo(
    () => new Set(expandedSubjectList.map(item => item.id)),
    [expandedSubjectList],
  );

  useEffect(() => {
    if (cycleClosedSubjectIdSet.size === 0) return;

    setCycleExpandedSubjectIds(prev => {
      const next = prev.filter(id => !cycleClosedSubjectIdSet.has(id) || preserveExpandedSubjectIdSet.has(id));
      return areArraysEqual(prev, next) ? prev : next;
    });
  }, [cycleClosedSubjectIdSet, preserveExpandedSubjectIdSet]);

  useEffect(() => {
    if (!cycleExpansionStorageKey || loadedCycleExpansionKeyRef.current === cycleExpansionStorageKey) return;

    loadedCycleExpansionKeyRef.current = cycleExpansionStorageKey;
    setCycleExpandedSubjectIds(readExpandedSubjectIds(cycleExpansionStorageKey));
    setHydratedCycleExpansionKey(cycleExpansionStorageKey);
  }, [cycleExpansionStorageKey]);

  useEffect(() => {
    if (!dataLoaded || expandedSubjectList.length === 0) return;

    setCycleExpandedSubjectIds(prev => {
      const next = prev.filter(id => validCycleSubjectIds.has(id));
      return areArraysEqual(prev, next) ? prev : next;
    });
  }, [dataLoaded, expandedSubjectList.length, validCycleSubjectIds]);

  useEffect(() => {
    if (!cycleExpansionStorageKey || hydratedCycleExpansionKey !== cycleExpansionStorageKey) return;

    localStorage.setItem(cycleExpansionStorageKey, JSON.stringify(cycleExpandedSubjectIds));
  }, [cycleExpansionStorageKey, cycleExpandedSubjectIds, hydratedCycleExpansionKey]);

  return {
    cycleExpandedSubjectIds,
    expandedSubjectIds,
    highlightedSubjectId,
    setCycleExpandedSubjectIds,
    setHighlightedSubjectId,
    setVerticalExpandedSubjectIds,
    verticalExpandedSubjectIds,
  };
}
