import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Subject } from '@/types';

const makeSubject = (): Subject => ({
  id: 'subject-1',
  name: 'Direito Constitucional',
  status: 'Em Estudo',
  edital_id: 'edital-1',
  is_visible: true,
  topics: [{
    id: 'topic-1',
    name: 'Controle de Constitucionalidade',
    completed: false,
    reviewCount: 0,
    review_count: 0,
    is_active: true,
    is_hidden: false,
  }],
});

import { useCycleTopicFocus } from './useCycleTopicFocus';

describe('useCycleTopicFocus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('expands, highlights and scrolls to the focused topic from navigation state', () => {
    const setActiveTab = vi.fn();
    const setCycleExpandedSubjectIds = vi.fn();
    const setHighlightedSubjectId = vi.fn();
    const replaceState = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
    const scrollIntoView = vi.fn();

    vi.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
      if (selector === '[data-topic-id="topic-1"]') {
        return { scrollIntoView } as unknown as Element;
      }
      return null;
    });

    renderHook(() => useCycleTopicFocus({
      expandedSubjectList: [{ subject: makeSubject() }],
      locationState: { focusSubjectId: 'subject-1', focusTopicId: 'topic-1' },
      subjects: [makeSubject()],
      setActiveTab,
      setCycleExpandedSubjectIds,
      setHighlightedSubjectId,
    }));

    expect(setActiveTab).toHaveBeenCalledWith('all');
    expect(setCycleExpandedSubjectIds).toHaveBeenCalledWith(['subject-1']);
    expect(setHighlightedSubjectId).toHaveBeenCalledWith('subject-1');

    vi.advanceTimersByTime(60);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(replaceState).toHaveBeenCalled();

    vi.advanceTimersByTime(1800);
    expect(setHighlightedSubjectId).toHaveBeenLastCalledWith(expect.any(Function));
  });

  it('expands the rendered unified subject when navigation state points to the original subject id', () => {
    const setActiveTab = vi.fn();
    const setCycleExpandedSubjectIds = vi.fn();
    const setHighlightedSubjectId = vi.fn();
    const unifiedSubject = {
      ...makeSubject(),
      id: 'unified-subject-1',
    };

    renderHook(() => useCycleTopicFocus({
      expandedSubjectList: [{ subject: unifiedSubject }],
      locationState: { focusSubjectId: 'subject-1', focusTopicId: 'topic-1' },
      subjects: [makeSubject()],
      setActiveTab,
      setCycleExpandedSubjectIds,
      setHighlightedSubjectId,
    }));

    expect(setCycleExpandedSubjectIds).toHaveBeenCalledWith(['unified-subject-1']);
    expect(setHighlightedSubjectId).toHaveBeenCalledWith('unified-subject-1');
  });
});
