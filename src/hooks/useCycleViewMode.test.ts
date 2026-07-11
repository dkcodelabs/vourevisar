import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCycleViewMode } from './useCycleViewMode';

describe('useCycleViewMode', () => {
  it('opens all vertical subjects when switching from cycle mode to edital mode', () => {
    const setActiveTab = vi.fn();
    const setVerticalExpandedSubjectIds = vi.fn();

    const { result } = renderHook(() => useCycleViewMode({
      activeTab: 'all',
      expandedSubjectIds: [],
      filteredSubjectIds: ['subject-1'],
      setActiveTab,
      setCycleExpandedSubjectIds: vi.fn(),
      setVerticalExpandedSubjectIds,
      verticalSubjectIds: ['subject-1', 'subject-2'],
    }));

    act(() => {
      result.current.handleViewModeToggle();
    });

    expect(setActiveTab).toHaveBeenCalledWith('vertical');
    expect(setVerticalExpandedSubjectIds).toHaveBeenCalledWith(['subject-1', 'subject-2']);
  });

  it('toggles the expanded item list for the active mode', () => {
    const setCycleExpandedSubjectIds = vi.fn();
    const setVerticalExpandedSubjectIds = vi.fn();

    const { result, rerender } = renderHook((activeTab: 'all' | 'vertical') => useCycleViewMode({
      activeTab,
      expandedSubjectIds: ['subject-1'],
      filteredSubjectIds: ['subject-1', 'subject-2'],
      setActiveTab: vi.fn(),
      setCycleExpandedSubjectIds,
      setVerticalExpandedSubjectIds,
      verticalSubjectIds: ['subject-3', 'subject-4'],
    }), {
      initialProps: 'all',
    });

    act(() => {
      result.current.toggleExpand('subject-2');
    });

    expect(setCycleExpandedSubjectIds).toHaveBeenCalledWith(expect.any(Function));

    const cycleUpdater = setCycleExpandedSubjectIds.mock.calls[0][0] as (ids: string[]) => string[];
    expect(cycleUpdater(['subject-1'])).toEqual(['subject-1', 'subject-2']);

    rerender('vertical');

    act(() => {
      result.current.toggleExpand('subject-4');
    });

    expect(setVerticalExpandedSubjectIds).toHaveBeenCalledWith(expect.any(Function));
    const verticalUpdater = setVerticalExpandedSubjectIds.mock.calls[0][0] as (ids: string[]) => string[];
    expect(verticalUpdater(['subject-3'])).toEqual(['subject-3', 'subject-4']);
  });

  it('toggles expand-all using the list from the active mode', () => {
    const setCycleExpandedSubjectIds = vi.fn();
    const setVerticalExpandedSubjectIds = vi.fn();

    const { result, rerender } = renderHook((props: {
      activeTab: 'all' | 'vertical';
      expandedSubjectIds: string[];
    }) => useCycleViewMode({
      activeTab: props.activeTab,
      expandedSubjectIds: props.expandedSubjectIds,
      filteredSubjectIds: ['subject-1', 'subject-2'],
      setActiveTab: vi.fn(),
      setCycleExpandedSubjectIds,
      setVerticalExpandedSubjectIds,
      verticalSubjectIds: ['subject-3', 'subject-4'],
    }), {
      initialProps: {
        activeTab: 'all',
        expandedSubjectIds: ['subject-1'],
      },
    });

    act(() => {
      result.current.toggleAllCycleSubjects();
    });

    expect(setCycleExpandedSubjectIds).toHaveBeenCalledWith(['subject-1', 'subject-2']);

    rerender({
      activeTab: 'vertical',
      expandedSubjectIds: ['subject-3', 'subject-4'],
    });

    act(() => {
      result.current.toggleAllCycleSubjects();
    });

    expect(setVerticalExpandedSubjectIds).toHaveBeenCalledWith([]);
  });
});
