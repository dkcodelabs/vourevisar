import { describe, expect, it } from 'vitest';

import { getCycleEntryState, type CycleEntryStateInput } from '@/utils/cycleEntryState';

const baseInput: CycleEntryStateInput = {
  access: { status: 'active' },
  content: {
    editalCount: 1,
    editaisWithContentCount: 1,
    cycleSubjectsCount: 2,
    hasActiveCycle: true,
    isLoading: false,
    hasLoadError: false,
    searchQuery: '',
    filteredItemCount: 2,
  },
};

describe('getCycleEntryState', () => {
  it('prioritizes access loading and access errors over content states', () => {
    expect(getCycleEntryState({ ...baseInput, access: { status: 'loading' } })).toEqual({ kind: 'access_loading' });
    expect(getCycleEntryState({ ...baseInput, access: { status: 'error' } })).toEqual({ kind: 'access_error' });
  });

  it('blocks expired or missing access before presenting an empty product state', () => {
    expect(getCycleEntryState({
      ...baseInput,
      access: { status: 'blocked', blockedReason: 'subscription_expired' },
      content: { ...baseInput.content, editalCount: 0, editaisWithContentCount: 0, cycleSubjectsCount: 0 },
    })).toEqual({ kind: 'access_blocked', reason: 'subscription_expired' });
  });

  it('reports a load failure before deriving content availability', () => {
    expect(getCycleEntryState({
      ...baseInput,
      content: { ...baseInput.content, hasLoadError: true },
    })).toEqual({ kind: 'load_error' });
  });

  it('distinguishes search with no matches from an empty cycle', () => {
    expect(getCycleEntryState({
      ...baseInput,
      content: { ...baseInput.content, searchQuery: 'direito', filteredItemCount: 0 },
    })).toEqual({ kind: 'search_empty' });
  });

  it('identifies first access when no edital exists', () => {
    expect(getCycleEntryState({
      ...baseInput,
      content: { ...baseInput.content, editalCount: 0, editaisWithContentCount: 0, cycleSubjectsCount: 0, hasActiveCycle: false },
    })).toEqual({ kind: 'first_access_no_editais' });
  });

  it('identifies editais that exist but have no content', () => {
    expect(getCycleEntryState({
      ...baseInput,
      content: { ...baseInput.content, editalCount: 2, editaisWithContentCount: 0, cycleSubjectsCount: 0, hasActiveCycle: false },
    })).toEqual({ kind: 'editais_without_content', editalCount: 2 });
  });

  it('identifies content ready to be loaded into the cycle', () => {
    expect(getCycleEntryState({
      ...baseInput,
      content: { ...baseInput.content, editalCount: 3, editaisWithContentCount: 2, cycleSubjectsCount: 0, hasActiveCycle: false },
    })).toEqual({ kind: 'editais_ready_not_loaded', editalCount: 3, readyEditalCount: 2 });
  });

  it('identifies a loaded cycle with no valid local subjects', () => {
    expect(getCycleEntryState({
      ...baseInput,
      content: { ...baseInput.content, cycleSubjectsCount: 0 },
    })).toEqual({ kind: 'cycle_loaded_empty', reason: 'removed_or_inconsistent' });
  });

  it('keeps a loaded cycle ready even when every topic was already started', () => {
    expect(getCycleEntryState({
      ...baseInput,
      content: { ...baseInput.content, cycleSubjectsCount: 2, filteredItemCount: 2 },
    })).toEqual({ kind: 'ready' });
  });

  it('does not let an active trial invent a separate content state', () => {
    expect(getCycleEntryState({ ...baseInput, access: { status: 'trial' } })).toEqual({ kind: 'ready' });
  });
});
