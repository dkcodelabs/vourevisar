import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Subject } from '@/types';

import { useCycleSearch } from './useCycleSearch';

type ExpandedSubjectListItem = {
  id: string;
  subject: Subject;
};

const makeSubject = (id: string, name: string, topicName: string): Subject => ({
  id,
  name,
  status: 'Em Estudo',
  edital_id: 'edital-1',
  is_visible: true,
  topics: [{
    id: `${id}-topic-1`,
    name: topicName,
    completed: false,
    reviewCount: 0,
    review_count: 0,
    is_active: true,
    is_hidden: false,
  }],
});

const expandedSubjectList: ExpandedSubjectListItem[] = [
  { id: 'subject-1', subject: makeSubject('subject-1', 'Direito Constitucional', 'Controle de Constitucionalidade') },
  { id: 'subject-2', subject: makeSubject('subject-2', 'Direito Penal', 'Tipicidade') },
];

describe('useCycleSearch', () => {
  it('preserves the previous expansion state and restores it when clearing the search', () => {
    const setQuery = vi.fn();
    const setCycleExpandedSubjectIds = vi.fn();
    const setIsCycleSearchOpen = vi.fn();

    const { result, rerender } = renderHook((props: {
      activeTab: 'all' | 'vertical';
      query: string;
    }) => useCycleSearch({
      activeTab: props.activeTab,
      cycleClosedSubjectIdSet: new Set(['subject-2']),
      cycleExpandedSubjectIds: ['subject-1', 'subject-2'],
      expandedSubjectList,
      isImportEditalModalOpen: false,
      query: props.query,
      setCycleExpandedSubjectIds,
      setIsCycleSearchOpen,
      setQuery,
    }), {
      initialProps: {
        activeTab: 'all',
        query: '',
      },
    });

    act(() => {
      result.current.handleCycleSearchChange('const');
    });

    expect(setQuery).toHaveBeenCalledWith('const');
    expect(setCycleExpandedSubjectIds).toHaveBeenCalledWith(['subject-1']);

    rerender({
      activeTab: 'all',
      query: 'const',
    });

    act(() => {
      result.current.closeCycleSearch();
    });

    expect(setIsCycleSearchOpen).toHaveBeenCalledWith(false);
    expect(setQuery).toHaveBeenLastCalledWith('');
    expect(setCycleExpandedSubjectIds).toHaveBeenLastCalledWith(['subject-1', 'subject-2']);
  });

  it('filters the rendered list by subject or topic name while ignoring the import modal state', () => {
    const { result, rerender } = renderHook((query: string) => useCycleSearch({
      activeTab: 'all',
      cycleClosedSubjectIdSet: new Set<string>(),
      cycleExpandedSubjectIds: [],
      expandedSubjectList,
      isImportEditalModalOpen: false,
      query,
      setCycleExpandedSubjectIds: vi.fn(),
      setIsCycleSearchOpen: vi.fn(),
      setQuery: vi.fn(),
    }), {
      initialProps: '',
    });

    expect(result.current.filteredList).toHaveLength(2);

    rerender('penal');
    expect(result.current.filteredList.map(item => item.subject.id)).toEqual(['subject-2']);

    rerender('controle');
    expect(result.current.filteredList.map(item => item.subject.id)).toEqual(['subject-1']);
  });

  it('does not alter cycle expansion while in vertical mode', () => {
    const setCycleExpandedSubjectIds = vi.fn();

    const { result } = renderHook(() => useCycleSearch({
      activeTab: 'vertical',
      cycleClosedSubjectIdSet: new Set<string>(),
      cycleExpandedSubjectIds: ['subject-1'],
      expandedSubjectList,
      isImportEditalModalOpen: false,
      query: '',
      setCycleExpandedSubjectIds,
      setIsCycleSearchOpen: vi.fn(),
      setQuery: vi.fn(),
    }));

    act(() => {
      result.current.handleCycleSearchChange('penal');
    });

    expect(setCycleExpandedSubjectIds).not.toHaveBeenCalled();
  });
});
