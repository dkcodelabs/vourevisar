import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SubjectMerge } from '@/types/merges';

import { useEditalOriginsWithMerge } from './useEditalOriginsWithMerge';

type EditalRow = {
  id: string;
  name: string;
  subject_ids: string[];
  active_subject_ids: string[];
  is_imported: boolean;
  merged_into_cycle: boolean;
  source_id?: string;
  organ?: string;
  position?: string;
  year?: string;
  exam_date?: string | null;
  exam_board?: string | null;
};

const mocks = vi.hoisted(() => ({
  editais: [] as EditalRow[],
  subjectMerges: [] as SubjectMerge[],
  topicMerges: [],
  user: { id: 'user-1' },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('@/hooks/useCycleState', () => ({
  useCycleState: () => ({
    isLoading: false,
    userCycle: null,
  }),
}));

vi.mock('@/services/mergeService', () => ({
  mergeService: {
    getActiveSubjectMerges: vi.fn(async () => mocks.subjectMerges),
    getActiveTopicMerges: vi.fn(async () => mocks.topicMerges),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(async () => {
          if (table === 'user_editais') {
            return { data: mocks.editais, error: null };
          }
          return { data: [], error: null };
        }),
      };

      return chain;
    }),
  },
}));

const makeEdital = (id: string, name: string, subjectId: string): EditalRow => ({
  id,
  name,
  subject_ids: [subjectId],
  active_subject_ids: [subjectId],
  is_imported: true,
  merged_into_cycle: true,
});

describe('useEditalOriginsWithMerge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.editais = [];
    mocks.subjectMerges = [];
    mocks.topicMerges = [];
  });

  it('keeps individual subject origins separate while exposing expanded merge origins', async () => {
    mocks.editais = [
      makeEdital('edital-a', 'TESTEA - CARGO A', 'math-a'),
      makeEdital('edital-b', 'TESTEB - CARGO B', 'math-b'),
      makeEdital('edital-c', 'TESTEC - CARGO C', 'math-c'),
    ];
    mocks.subjectMerges = [{
      id: 'merge-1',
      user_id: 'user-1',
      cycle_id: 'cycle-1',
      primary_subject_id: 'math-a',
      merged_subject_ids: ['math-b', 'math-c'],
      source_edital_ids: ['edital-a', 'edital-b', 'edital-c'],
      display_name: 'MATEMATICA',
      created_at: '2026-07-14T00:00:00.000Z',
      reverted_at: null,
      status: 'active',
      created_by_ai: false,
      match_type: 'exact',
    }];

    const { result } = renderHook(() => useEditalOriginsWithMerge());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.originsMap.get('math-a')?.map(origin => origin.name)).toEqual([
      'TESTEA - CARGO A',
      'TESTEB - CARGO B',
      'TESTEC - CARGO C',
    ]);
    expect(result.current.originsMap.get('math-b')?.map(origin => origin.name)).toEqual([
      'TESTEA - CARGO A',
      'TESTEB - CARGO B',
      'TESTEC - CARGO C',
    ]);

    expect(result.current.subjectIndividualOriginsMap.get('math-a')?.map(origin => origin.name)).toEqual(['TESTEA - CARGO A']);
    expect(result.current.subjectIndividualOriginsMap.get('math-b')?.map(origin => origin.name)).toEqual(['TESTEB - CARGO B']);
    expect(result.current.subjectIndividualOriginsMap.get('math-c')?.map(origin => origin.name)).toEqual(['TESTEC - CARGO C']);
  });
});
