type SubjectTab = 'all' | 'vertical';

type UseCycleViewModeInput = {
  activeTab: SubjectTab;
  expandedSubjectIds: string[];
  filteredSubjectIds: string[];
  setActiveTab: React.Dispatch<React.SetStateAction<SubjectTab>>;
  setCycleExpandedSubjectIds: React.Dispatch<React.SetStateAction<string[]>>;
  setVerticalExpandedSubjectIds: React.Dispatch<React.SetStateAction<string[]>>;
  verticalSubjectIds: string[];
};

export function useCycleViewMode({
  activeTab,
  expandedSubjectIds,
  filteredSubjectIds,
  setActiveTab,
  setCycleExpandedSubjectIds,
  setVerticalExpandedSubjectIds,
  verticalSubjectIds,
}: UseCycleViewModeInput) {
  const handleViewModeToggle = () => {
    const nextTab: SubjectTab = activeTab === 'vertical' ? 'all' : 'vertical';
    setActiveTab(nextTab);

    if (nextTab === 'vertical') {
      setVerticalExpandedSubjectIds(verticalSubjectIds);
    }
  };

  const toggleExpand = (itemId: string) => {
    const updateExpandedIds = (prev: string[]) =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];

    if (activeTab === 'vertical') {
      setVerticalExpandedSubjectIds(updateExpandedIds);
      return;
    }

    setCycleExpandedSubjectIds(updateExpandedIds);
  };

  const toggleAllCycleSubjects = () => {
    const subjectIds = activeTab === 'vertical'
      ? verticalSubjectIds
      : filteredSubjectIds;
    const allSubjectsExpanded = subjectIds.length > 0 &&
      subjectIds.every(id => expandedSubjectIds.includes(id));

    if (activeTab === 'vertical') {
      setVerticalExpandedSubjectIds(allSubjectsExpanded ? [] : subjectIds);
      return;
    }

    setCycleExpandedSubjectIds(allSubjectsExpanded ? [] : subjectIds);
  };

  return {
    handleViewModeToggle,
    toggleAllCycleSubjects,
    toggleExpand,
  };
}
