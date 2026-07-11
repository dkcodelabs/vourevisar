import { useCallback, useMemo } from 'react';

import type { Subject, Topic, UserEdital, UserCycle } from '@/types';

type ExpandedSubjectListItem = {
  id: string;
  subject: Subject;
};

type UseCycleVerticalViewDataInput = {
  completedEditalSubjectIdSet: Set<string>;
  dynamicUnificationMap: UserCycle['unification_map'] | null | undefined;
  editaisNoCiclo: Array<Partial<UserEdital> & { id: string; name: string }>;
  filteredList: ExpandedSubjectListItem[];
  fullyStartedSubjectIdSet: Set<string>;
  getUnifiedSubjectId: (subjectId: string, map: UserCycle['unification_map'] | null | undefined) => string;
  isImportEditalModalOpen: boolean;
  isTopicCompleted: (topic: Topic) => boolean;
  isTopicStarted: (topic: Topic) => boolean;
  isVisibleCycleTopic: (topic: Topic) => boolean;
  query: string;
  studiedCycleIdSet: Set<string>;
  userCycleStartDate?: string | null;
};

const normalizeText = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const isTopicNewlyStartedInCycle = (topic: Topic, cycleStart?: string | null): boolean => {
  if (!cycleStart) return false;

  const firstStudiedAt = topic.first_studied_at || topic.firstStudiedAt;
  if (!firstStudiedAt) return false;

  const firstStudiedTime = new Date(firstStudiedAt).getTime();
  const cycleStartTime = new Date(cycleStart).getTime();

  return Number.isFinite(firstStudiedTime) &&
    Number.isFinite(cycleStartTime) &&
    firstStudiedTime >= cycleStartTime;
};

export function useCycleVerticalViewData({
  completedEditalSubjectIdSet,
  dynamicUnificationMap,
  editaisNoCiclo,
  filteredList,
  fullyStartedSubjectIdSet,
  getUnifiedSubjectId,
  isImportEditalModalOpen,
  isTopicCompleted,
  isTopicStarted,
  isVisibleCycleTopic,
  query,
  studiedCycleIdSet,
  userCycleStartDate,
}: UseCycleVerticalViewDataInput) {
  const verticalSubjectList = useMemo(() => {
    const normalizedQuery = query.trim() && !isImportEditalModalOpen
      ? normalizeText(query)
      : '';

    return filteredList
      .map(({ subject }) => {
        const subjectMatches = normalizedQuery
          ? normalizeText(subject.name).includes(normalizedQuery)
          : false;

        const topics = subject.topics
          .filter(isVisibleCycleTopic)
          .filter(topic => {
            if (!normalizedQuery || subjectMatches) return true;
            return normalizeText(topic.name).includes(normalizedQuery);
          });

        return {
          id: subject.id,
          subject,
          topics,
        };
      })
      .filter(item => item.topics.length > 0);
  }, [filteredList, isImportEditalModalOpen, isVisibleCycleTopic, query]);

  const verticalSummaryEdital = useMemo(() => {
    const cycleSubjectIds = new Set(filteredList.map(item => item.subject.id));
    const activeCycleEditais = editaisNoCiclo.filter(edital =>
      (edital.subject_ids || []).some(subjectId =>
        cycleSubjectIds.has(getUnifiedSubjectId(subjectId, dynamicUnificationMap))
      )
    );

    return activeCycleEditais[0] || editaisNoCiclo[0] || null;
  }, [dynamicUnificationMap, editaisNoCiclo, filteredList, getUnifiedSubjectId]);

  const getSubjectTopicSummaryLabel = useCallback((subject: Subject, activeSubjectTopics: Topic[]) => {
    const totalTopicsCount = activeSubjectTopics.length;
    const completedTopicsCount = activeSubjectTopics.filter(isTopicCompleted).length;
    const inReviewTopicsCount = activeSubjectTopics.filter(topic =>
      isTopicStarted(topic) && !isTopicCompleted(topic)
    ).length;
    const startedTopicsCount = inReviewTopicsCount + completedTopicsCount;
    const activeTopicsStartedInCurrentCycle = subject.topics.filter(topic =>
      isVisibleCycleTopic(topic) && isTopicNewlyStartedInCycle(topic, userCycleStartDate)
    ).length;

    if (totalTopicsCount === 0) return '0 tópicos';
    if (completedEditalSubjectIdSet.has(subject.id)) {
      return `${completedTopicsCount}/${totalTopicsCount} tópicos concluídos`;
    }
    if (studiedCycleIdSet.has(subject.id)) {
      return activeTopicsStartedInCurrentCycle > 0
        ? `${activeTopicsStartedInCurrentCycle}/${totalTopicsCount} tópicos neste ciclo`
        : 'Concluída no ciclo';
    }
    if (fullyStartedSubjectIdSet.has(subject.id)) {
      return `${startedTopicsCount}/${totalTopicsCount} tópicos iniciados`;
    }

    return `${startedTopicsCount}/${totalTopicsCount} tópicos iniciados`;
  }, [
    completedEditalSubjectIdSet,
    fullyStartedSubjectIdSet,
    isTopicCompleted,
    isTopicStarted,
    isVisibleCycleTopic,
    studiedCycleIdSet,
    userCycleStartDate,
  ]);

  return {
    getSubjectTopicSummaryLabel,
    verticalSubjectList,
    verticalSummaryEdital,
  };
}
