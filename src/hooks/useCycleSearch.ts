import { useMemo, useState } from 'react';

import type { Subject } from '@/types';

type SubjectTab = 'all' | 'vertical';

type ExpandedSubjectListItem = {
  id: string;
  subject: Subject;
};

type UseCycleSearchInput = {
  activeTab: SubjectTab;
  cycleClosedSubjectIdSet: Set<string>;
  cycleExpandedSubjectIds: string[];
  expandedSubjectList: ExpandedSubjectListItem[];
  isImportEditalModalOpen: boolean;
  query: string;
  setCycleExpandedSubjectIds: React.Dispatch<React.SetStateAction<string[]>>;
  setIsCycleSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
};

const normalizeText = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function useCycleSearch({
  activeTab,
  cycleClosedSubjectIdSet,
  cycleExpandedSubjectIds,
  expandedSubjectList,
  isImportEditalModalOpen,
  query,
  setCycleExpandedSubjectIds,
  setIsCycleSearchOpen,
  setQuery,
}: UseCycleSearchInput) {
  const [expandedBeforeSearch, setExpandedBeforeSearch] = useState<string[]>([]);

  const filteredList = useMemo(() => {
    if (!query.trim() || isImportEditalModalOpen) {
      return expandedSubjectList;
    }

    const normalizedQuery = normalizeText(query);

    return expandedSubjectList.filter(item => {
      const matchesSubject = normalizeText(item.subject.name).includes(normalizedQuery);
      const hasMatchingTopic = item.subject.topics?.some(topic =>
        normalizeText(topic.name).includes(normalizedQuery)
      );

      return matchesSubject || hasMatchingTopic;
    });
  }, [expandedSubjectList, isImportEditalModalOpen, query]);

  const handleCycleSearchChange = (nextQuery: string) => {
    const previousQuery = query;
    setQuery(nextQuery);

    if (activeTab === 'vertical') {
      return;
    }

    if (!previousQuery && nextQuery.trim()) {
      setExpandedBeforeSearch([...cycleExpandedSubjectIds]);
    }

    if (nextQuery.trim()) {
      const normalizedQuery = normalizeText(nextQuery);
      const newExpanded: string[] = [];

      expandedSubjectList.forEach(item => {
        const matchesSubject = normalizeText(item.subject.name).includes(normalizedQuery);
        const hasMatchingTopic = item.subject.topics?.some(topic =>
          normalizeText(topic.name).includes(normalizedQuery)
        );

        if ((matchesSubject || hasMatchingTopic) && !cycleClosedSubjectIdSet.has(item.subject.id)) {
          newExpanded.push(item.id);
        }
      });

      setCycleExpandedSubjectIds(newExpanded);
      return;
    }

    setCycleExpandedSubjectIds(expandedBeforeSearch);
    setExpandedBeforeSearch([]);
  };

  const closeCycleSearch = () => {
    setIsCycleSearchOpen(false);
    handleCycleSearchChange('');
  };

  return {
    closeCycleSearch,
    filteredList,
    handleCycleSearchChange,
  };
}
