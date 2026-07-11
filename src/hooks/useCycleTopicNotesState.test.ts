import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Subject, Topic } from '@/types';

import { useCycleTopicNotesState } from './useCycleTopicNotesState';

const topic: Topic = {
  id: 'topic-1',
  name: 'Controle de Constitucionalidade',
  completed: false,
  reviewCount: 0,
  review_count: 0,
  is_active: true,
  is_hidden: false,
};

const subject: Subject = {
  id: 'subject-1',
  name: 'Direito Constitucional',
  status: 'Em Estudo',
  edital_id: 'edital-1',
  is_visible: true,
  topics: [topic],
};

describe('useCycleTopicNotesState', () => {
  it('opens and closes notes from the cycle queue', () => {
    const { result } = renderHook(() => useCycleTopicNotesState({
      verticalSubjectList: [],
    }));

    act(() => {
      result.current.openQueueTopicNotes(subject, topic);
    });

    expect(result.current.selectedTopicForNotes).toEqual({
      id: 'topic-1',
      name: 'Controle de Constitucionalidade',
      subjectName: 'Direito Constitucional',
    });

    act(() => {
      result.current.closeTopicNotes();
    });

    expect(result.current.selectedTopicForNotes).toBeNull();
  });

  it('opens notes from the vertical edital list', () => {
    const { result } = renderHook(() => useCycleTopicNotesState({
      verticalSubjectList: [{
        id: 'subject-1',
        subject,
        topics: [topic],
      }],
    }));

    act(() => {
      result.current.openVerticalTopicNotes('subject-1', 'topic-1');
    });

    expect(result.current.selectedTopicForNotes?.id).toBe('topic-1');
  });
});
