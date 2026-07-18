export type CycleEntryAccessStatus =
  | 'loading'
  | 'error'
  | 'blocked'
  | 'trial'
  | 'active';

export type CycleEntryState =
  | { kind: 'access_loading' }
  | { kind: 'access_error' }
  | { kind: 'access_blocked'; reason: 'subscription_required' | 'subscription_expired' | 'unknown' }
  | { kind: 'load_error' }
  | { kind: 'search_empty' }
  | { kind: 'first_access_no_editais' }
  | { kind: 'editais_without_content'; editalCount: number }
  | { kind: 'editais_ready_not_loaded'; editalCount: number; readyEditalCount: number }
  | { kind: 'cycle_loaded_empty'; reason: 'removed_or_inconsistent' | 'no_valid_content' }
  | { kind: 'ready' };

export type CycleEntryStateInput = {
  access: {
    status: CycleEntryAccessStatus;
    blockedReason?: 'subscription_required' | 'subscription_expired' | 'unknown';
  };
  content: {
    editalCount: number;
    editaisWithContentCount: number;
    cycleSubjectsCount: number;
    hasActiveCycle: boolean;
    isLoading: boolean;
    hasLoadError: boolean;
    searchQuery: string;
    filteredItemCount: number;
  };
};

/**
 * Decides which product state is true before the empty-state UI is rendered.
 * It intentionally uses only persisted/loading/error signals supplied by the caller.
 */
export function getCycleEntryState({ access, content }: CycleEntryStateInput): CycleEntryState {
  if (access.status === 'loading') return { kind: 'access_loading' };
  if (access.status === 'error') return { kind: 'access_error' };
  if (access.status === 'blocked') {
    return { kind: 'access_blocked', reason: access.blockedReason ?? 'unknown' };
  }
  if (content.hasLoadError) return { kind: 'load_error' };

  if (content.searchQuery.trim() && content.filteredItemCount === 0 && content.cycleSubjectsCount > 0) {
    return { kind: 'search_empty' };
  }

  if (content.editalCount === 0) return { kind: 'first_access_no_editais' };

  if (content.editaisWithContentCount === 0) {
    return { kind: 'editais_without_content', editalCount: content.editalCount };
  }

  if (!content.hasActiveCycle) {
    return {
      kind: 'editais_ready_not_loaded',
      editalCount: content.editalCount,
      readyEditalCount: content.editaisWithContentCount,
    };
  }

  if (!content.isLoading && content.cycleSubjectsCount === 0) {
    return { kind: 'cycle_loaded_empty', reason: 'removed_or_inconsistent' };
  }

  return { kind: 'ready' };
}
