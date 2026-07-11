import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Subject } from '@/types';
import type { ExpandedSubjectItem } from './useCycleSubjectListState';

import { useCycleQueueDisplayState } from './useCycleQueueDisplayState';

const makeItem = (id: string): ExpandedSubjectItem => ({
  id,
  subject: {
    id,
    name: `Matéria ${id}`,
    status: 'Em Estudo',
    edital_id: 'edital-1',
    is_visible: true,
    topics: [],
  } as Subject,
});

describe('useCycleQueueDisplayState', () => {
  it('orders pending subjects before closed subjects and exposes workspace flags', () => {
    const filteredList = [makeItem('closed-subject'), makeItem('open-subject')];

    const { result } = renderHook(() => useCycleQueueDisplayState({
      cycleClosedSubjectIdSet: new Set(['closed-subject']),
      expandedSubjectList: filteredList,
      filteredList,
      userCycle: {
        ciclo_atual: ['closed-subject', 'open-subject'],
        name: 'Meu ciclo',
      },
    }));

    expect(result.current.orderedCycleDisplayList.map(item => item.id)).toEqual(['open-subject', 'closed-subject']);
    expect(result.current.displayList.map(item => item.id)).toEqual(['open-subject', 'closed-subject']);
    expect(result.current.showCycleWorkspace).toBe(true);
    expect(result.current.cycleDisplayName).toBe('Meu ciclo');
    expect(result.current.isCycleFullyStudied).toBe(false);
  });

  it('paginates the queue and loads the next page on demand', () => {
    const filteredList = Array.from({ length: 27 }, (_, index) => makeItem(`subject-${index + 1}`));

    const { result } = renderHook(() => useCycleQueueDisplayState({
      cycleClosedSubjectIdSet: new Set<string>(),
      expandedSubjectList: filteredList,
      filteredList,
      userCycle: {
        ciclo_atual: filteredList.map(item => item.id),
        name: '',
      },
    }));

    expect(result.current.displayList).toHaveLength(25);
    expect(result.current.hasMore).toBe(true);
    act(() => {
      result.current.handleLoadMore();
    });

    expect(result.current.displayList).toHaveLength(27);
    expect(result.current.hasMore).toBe(false);
  });
});
