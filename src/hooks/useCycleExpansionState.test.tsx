import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useCycleExpansionState } from './useCycleExpansionState';

const expandedSubjectList = [
  { id: 'subject-1' },
  { id: 'subject-2' },
];

describe('useCycleExpansionState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hydrates persisted cycle expansion by user and ignores invalid ids', async () => {
    localStorage.setItem(
      'study_cycle_expanded_subjects_user-1',
      JSON.stringify(['subject-1', 'missing-subject', 42]),
    );

    const { result } = renderHook(() => useCycleExpansionState({
      activeTab: 'all',
      cycleClosedSubjectIdSet: new Set<string>(),
      dataLoaded: true,
      expandedSubjectList,
      userId: 'user-1',
    }));

    await waitFor(() => {
      expect(result.current.cycleExpandedSubjectIds).toEqual(['subject-1']);
    });
  });

  it('removes closed or unavailable subjects from the expanded cycle list', async () => {
    localStorage.setItem(
      'study_cycle_expanded_subjects_user-1',
      JSON.stringify(['subject-1', 'subject-2', 'missing-subject']),
    );

    const { result } = renderHook(() => useCycleExpansionState({
      activeTab: 'all',
      cycleClosedSubjectIdSet: new Set(['subject-2']),
      dataLoaded: true,
      expandedSubjectList,
      userId: 'user-1',
    }));

    await waitFor(() => {
      expect(result.current.cycleExpandedSubjectIds).toEqual(['subject-1']);
    });
  });

  it('keeps a closed subject expanded when it is the current focus target', async () => {
    localStorage.setItem(
      'study_cycle_expanded_subjects_user-1',
      JSON.stringify(['subject-1', 'subject-2']),
    );

    const { result } = renderHook(() => useCycleExpansionState({
      activeTab: 'all',
      cycleClosedSubjectIdSet: new Set(['subject-2']),
      dataLoaded: true,
      expandedSubjectList,
      preserveExpandedSubjectIdSet: new Set(['subject-2']),
      userId: 'user-1',
    }));

    await waitFor(() => {
      expect(result.current.cycleExpandedSubjectIds).toEqual(['subject-1', 'subject-2']);
    });
  });

  it('persists cycle expansion changes after hydration', async () => {
    const { result } = renderHook(() => useCycleExpansionState({
      activeTab: 'all',
      cycleClosedSubjectIdSet: new Set<string>(),
      dataLoaded: true,
      expandedSubjectList,
      userId: 'user-1',
    }));

    act(() => {
      result.current.setCycleExpandedSubjectIds(['subject-2']);
    });

    await waitFor(() => {
      expect(localStorage.getItem('study_cycle_expanded_subjects_user-1')).toBe(JSON.stringify(['subject-2']));
    });
  });

  it('returns expansion from the active view mode', () => {
    const { result, rerender } = renderHook((activeTab: 'all' | 'vertical') => useCycleExpansionState({
      activeTab,
      cycleClosedSubjectIdSet: new Set<string>(),
      dataLoaded: true,
      expandedSubjectList,
      userId: 'user-1',
    }), {
      initialProps: 'all',
    });

    act(() => {
      result.current.setCycleExpandedSubjectIds(['subject-1']);
      result.current.setVerticalExpandedSubjectIds(['subject-2']);
    });

    expect(result.current.expandedSubjectIds).toEqual(['subject-1']);

    rerender('vertical');

    expect(result.current.expandedSubjectIds).toEqual(['subject-2']);
  });
});
