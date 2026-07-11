import type { RefObject } from 'react';

import { CycleReorderButton } from '@/components/study-cycle/CycleReorderButton';
import { CycleSearchControl } from '@/components/study-cycle/CycleSearchControl';
import { CycleViewModeButton } from '@/components/study-cycle/CycleViewModeButton';
import { CycleWorkspaceHeader } from '@/components/study-cycle/CycleWorkspaceHeader';

type CycleWorkspaceHeaderSectionProps = {
  activeTab: 'all' | 'vertical';
  cycleDisplayName: string;
  cycleSearchQuery: string;
  expandedSubjectIds: string[];
  filteredSubjectIds: string[];
  inputRef: RefObject<HTMLInputElement | null>;
  isReorderingCycle: boolean;
  onActivateSearch: () => void;
  onClearSearch: () => void;
  onSearchChange: (value: string) => void;
  onToggleAll: () => void;
  onToggleReorder: () => void;
  onToggleViewMode: () => void;
  verticalSubjectIds: string[];
};

export function CycleWorkspaceHeaderSection({
  activeTab,
  cycleDisplayName,
  cycleSearchQuery,
  expandedSubjectIds,
  filteredSubjectIds,
  inputRef,
  isReorderingCycle,
  onActivateSearch,
  onClearSearch,
  onSearchChange,
  onToggleAll,
  onToggleReorder,
  onToggleViewMode,
  verticalSubjectIds,
}: CycleWorkspaceHeaderSectionProps) {
  const isCycleMode = activeTab === 'all';
  const expandableSubjectIds = isCycleMode ? filteredSubjectIds : verticalSubjectIds;
  const allExpanded = expandableSubjectIds.length > 0
    && expandableSubjectIds.every((id) => expandedSubjectIds.includes(id));
  const title = isCycleMode ? (cycleDisplayName || 'Fila do Ciclo') : 'Edital Verticalizado';
  const count = expandableSubjectIds.length;

  return (
    <CycleWorkspaceHeader
      allExpanded={allExpanded}
      canToggleAll={expandableSubjectIds.length > 0}
      count={count}
      isCycleMode={isCycleMode}
      onToggleAll={onToggleAll}
      reorderControl={(
        <CycleReorderButton
          isReorderingCycle={isReorderingCycle}
          onToggle={onToggleReorder}
          reorderDisabled={activeTab === 'vertical'}
        />
      )}
      searchControl={(
        <CycleSearchControl
          inputRef={inputRef}
          onActivate={onActivateSearch}
          onChange={onSearchChange}
          onClear={onClearSearch}
          query={cycleSearchQuery}
        />
      )}
      title={title}
      viewModeControl={(
        <CycleViewModeButton
          activeTab={activeTab}
          onToggle={onToggleViewMode}
        />
      )}
    />
  );
}
