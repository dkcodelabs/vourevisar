import { useCallback, useMemo } from 'react';

import { applyUnificationMap, getUnifiedSubjectId } from '@/services/cycleMergeService';
import type { Subject, Topic } from '@/types';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';
import {
  getVisibleCycleTopicIds,
  getVisibleCycleTopics,
} from '@/utils/studyCycleTopicVisibility';

type UserCycleLike = {
  ciclo_atual?: string[] | null;
  materias_estudadas_ciclo?: string[] | null;
  name?: string | null;
} | null | undefined;

export type ExpandedSubjectItem = {
  id: string;
  subject: Subject;
};

type UseCycleSubjectListStateInput = {
  activeSubjectIdsSet: Set<string>;
  dynamicUnificationMap: CycleUnificationMap | null | undefined;
  isTopicCompleted: (topic: Topic) => boolean;
  isTopicStarted: (topic: Topic) => boolean;
  localSubjects: Subject[];
  userCycle: UserCycleLike;
};

const isSubjectCompletedInEdital = (
  subject: Subject,
  isTopicCompleted: (topic: Topic) => boolean,
) => {
  const activeTopics = getVisibleCycleTopics(subject.topics);
  return activeTopics.length > 0 && activeTopics.every(isTopicCompleted);
};

const isSubjectFirstContactClosed = (
  subject: Subject,
  isTopicStarted: (topic: Topic) => boolean,
) => {
  const activeTopics = getVisibleCycleTopics(subject.topics);
  return activeTopics.length > 0 && activeTopics.every(isTopicStarted);
};

export function useCycleSubjectListState({
  activeSubjectIdsSet,
  dynamicUnificationMap,
  isTopicCompleted,
  isTopicStarted,
  localSubjects,
  userCycle,
}: UseCycleSubjectListStateInput) {
  const expandedSubjectList = useMemo<ExpandedSubjectItem[]>(() => {
    if (!localSubjects.length) return [];

    const cicloAtual = userCycle?.ciclo_atual || [];
    const subjectsInCycleSet = new Set(cicloAtual);
    const rawVisibleSubjects = localSubjects.filter(subject => {
      return subjectsInCycleSet.has(subject.id) || activeSubjectIdsSet.has(subject.id);
    });

    const visibleSubjects = applyUnificationMap(rawVisibleSubjects, dynamicUnificationMap);

    if (cicloAtual.length === 0 || visibleSubjects.length === 0) {
      return visibleSubjects.map(subject => ({
        id: subject.id,
        subject,
      }));
    }

    const seen = new Set<string>();
    const expanded: ExpandedSubjectItem[] = [];

    cicloAtual.forEach((originalSubjectId: string) => {
      const mappedSubjectId = getUnifiedSubjectId(originalSubjectId, dynamicUnificationMap);
      if (seen.has(mappedSubjectId)) return;

      const subject = visibleSubjects.find(item => item.id === mappedSubjectId);
      if (!subject) return;

      seen.add(mappedSubjectId);
      expanded.push({ id: subject.id, subject });
    });

    visibleSubjects.forEach(subject => {
      if (seen.has(subject.id)) return;

      seen.add(subject.id);
      expanded.push({ id: subject.id, subject });
    });

    return expanded;
  }, [activeSubjectIdsSet, dynamicUnificationMap, localSubjects, userCycle?.ciclo_atual]);

  const visibleCycleTopicIds = useMemo(
    () => getVisibleCycleTopicIds(expandedSubjectList.map(item => item.subject)),
    [expandedSubjectList],
  );

  const getEquivalentSubjectIds = useCallback((subjectId: string) => {
    const ids = new Set<string>([subjectId, getUnifiedSubjectId(subjectId, dynamicUnificationMap)]);
    const group = dynamicUnificationMap?.unifiedSubjects.find(unified =>
      unified.originalSubjectIds.some(id => ids.has(id))
    );

    group?.originalSubjectIds.forEach(id => ids.add(id));
    return ids;
  }, [dynamicUnificationMap]);

  const studiedCycleIdSet = useMemo(() => {
    const studiedIds = userCycle?.materias_estudadas_ciclo || [];
    const ids = new Set<string>();

    studiedIds.forEach((id: string) => {
      getEquivalentSubjectIds(id).forEach(equivalentId => ids.add(equivalentId));
    });

    return ids;
  }, [getEquivalentSubjectIds, userCycle?.materias_estudadas_ciclo]);

  const completedEditalSubjectIdSet = useMemo(() => {
    const ids = new Set<string>();

    expandedSubjectList.forEach(item => {
      if (!isSubjectCompletedInEdital(item.subject, isTopicCompleted)) return;
      getEquivalentSubjectIds(item.subject.id).forEach(equivalentId => ids.add(equivalentId));
    });

    return ids;
  }, [expandedSubjectList, getEquivalentSubjectIds, isTopicCompleted]);

  const fullyStartedSubjectIdSet = useMemo(() => {
    const ids = new Set<string>();

    expandedSubjectList.forEach(item => {
      if (!isSubjectFirstContactClosed(item.subject, isTopicStarted)) return;
      getEquivalentSubjectIds(item.subject.id).forEach(equivalentId => ids.add(equivalentId));
    });

    return ids;
  }, [expandedSubjectList, getEquivalentSubjectIds, isTopicStarted]);

  const cycleClosedSubjectIdSet = useMemo(() => {
    return new Set<string>([
      ...Array.from(studiedCycleIdSet),
      ...Array.from(fullyStartedSubjectIdSet),
      ...Array.from(completedEditalSubjectIdSet),
    ]);
  }, [completedEditalSubjectIdSet, fullyStartedSubjectIdSet, studiedCycleIdSet]);

  return {
    completedEditalSubjectIdSet,
    cycleClosedSubjectIdSet,
    expandedSubjectList,
    fullyStartedSubjectIdSet,
    getEquivalentSubjectIds,
    studiedCycleIdSet,
    visibleCycleTopicIds,
  };
}
