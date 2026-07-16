import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Subject } from '@/types';

const mocks = vi.hoisted(() => ({
  fetchTopicReviewStats: vi.fn(),
  fetchTopicReviewStudyMinutes: vi.fn(),
  recordCycleEvent: vi.fn(),
  supabaseSnapshotsOrder: vi.fn(),
  supabaseEventsOrder: vi.fn(),
}));

vi.mock('@/services/topicReviewService', () => ({
  fetchTopicReviewStats: (...args: unknown[]) => mocks.fetchTopicReviewStats(...args),
  fetchTopicReviewStudyMinutes: (...args: unknown[]) => mocks.fetchTopicReviewStudyMinutes(...args),
}));

vi.mock('@/hooks/useCycleStudyEventRecorder', () => ({
  useCycleStudyEventRecorder: () => ({
    recordCycleEvent: mocks.recordCycleEvent,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: (_field: string, _value: string) => ({
          eq: (_innerField: string, _innerValue: string) => ({
            order: (...args: unknown[]) => {
              if (table === 'cycle_rotation_snapshots') return mocks.supabaseSnapshotsOrder(...args);
              return mocks.supabaseEventsOrder(...args);
            },
          }),
        }),
      }),
    }),
  },
}));

import { useSubjectsCycleRuntime } from './useSubjectsCycleRuntime';

describe('useSubjectsCycleRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchTopicReviewStats.mockResolvedValue(new Map([['topic-1', { reviewCount: 2, hardReviewCount: 1 }]]));
    mocks.fetchTopicReviewStudyMinutes.mockResolvedValue(new Map([['topic-1', 30]]));
    mocks.supabaseSnapshotsOrder.mockReturnValue({
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    mocks.supabaseEventsOrder.mockReturnValue({
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
  });

  it('loads review stats/study minutes and records confirmed cycle events with topic metadata', async () => {
    const subject = {
      id: 'subject-1',
      name: 'Direito Constitucional',
      edital_id: 'edital-1',
      topics: [{ id: 'topic-1', name: 'Controle', subject_id: 'subject-1' }],
    } as unknown as Subject;

    const { result } = renderHook(() => useSubjectsCycleRuntime({
      difficultyModalData: {
        duration: 25,
        reviewCount: 1,
        reviewStage: 'Primeiro Contato',
        subjectId: 'subject-1',
        subjectName: 'Direito Constitucional',
        topicId: 'topic-1',
        topicName: 'Controle',
      },
      dynamicUnificationMap: {
        createdAt: '2026-07-01T00:00:00Z',
        editalIds: [],
        standaloneSubjectIds: [],
        unifiedSubjects: [],
        version: 1,
      },
      localSubjects: [subject],
      subjects: [subject],
      user: { id: 'user-1' },
      userCycle: {
        id: 'cycle-1',
        ciclo_atual: ['subject-1'],
        ciclos_realizados: 0,
      } as never,
      visibleCycleTopicIds: ['topic-1'],
    }));

    await waitFor(() => {
      expect(mocks.fetchTopicReviewStats).toHaveBeenCalledWith(['topic-1']);
      expect(mocks.fetchTopicReviewStudyMinutes).toHaveBeenCalledWith(['topic-1']);
    });

    await waitFor(() => {
      expect(result.current.topicStats.get('topic-1')?.reviewCount).toBe(2);
      expect(result.current.topicStudyMinutes.get('topic-1')).toBe(30);
    });

    await result.current.recordConfirmedTopicCycleEvent(2, 15);

    expect(mocks.recordCycleEvent).toHaveBeenCalledWith('topic_started', expect.objectContaining({
      editalId: 'edital-1',
      subjectId: 'subject-1',
      topicId: 'topic-1',
      metadata: expect.objectContaining({
        topicName: 'Controle',
        subjectName: 'Direito Constitucional',
        reviewCount: 1,
        reviewStage: 'Primeiro Contato',
        difficulty: 2,
        duration: 15,
      }),
    }));
  });
});
