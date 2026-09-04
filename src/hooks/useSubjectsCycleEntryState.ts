import { useMemo } from 'react';

import { getCycleEntryState, type CycleEntryState } from '@/utils/cycleEntryState';

type UseSubjectsCycleEntryStateInput = {
  cycleSearchQuery: string;
  editalCount: number;
  editaisWithContentCount: number;
  hasActiveCycle: boolean;
  isLoading: boolean;
  isOriginsLoading: boolean;
  loadError: unknown;
  loading: boolean;
  cycleSubjectsCount: number;
  filteredItemCount: number;
};

export function useSubjectsCycleEntryState({
  cycleSearchQuery,
  editalCount,
  editaisWithContentCount,
  hasActiveCycle,
  isLoading,
  isOriginsLoading,
  loadError,
  loading,
  cycleSubjectsCount,
  filteredItemCount,
}: UseSubjectsCycleEntryStateInput): CycleEntryState {
  return useMemo(() => getCycleEntryState({
    access: { status: 'active' },
    content: {
      editalCount,
      editaisWithContentCount,
      cycleSubjectsCount,
      hasActiveCycle,
      isLoading: isLoading || loading || isOriginsLoading,
      hasLoadError: Boolean(loadError),
      searchQuery: cycleSearchQuery,
      filteredItemCount,
    },
  }), [cycleSearchQuery, cycleSubjectsCount, editalCount, editaisWithContentCount, filteredItemCount, hasActiveCycle, isLoading, isOriginsLoading, loadError, loading]);
}
