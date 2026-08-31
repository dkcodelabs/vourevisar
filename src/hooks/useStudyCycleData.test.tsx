import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudyCycleData } from './useStudyCycleData';

const mocks = vi.hoisted(() => ({
  user: { id: 'user-1' },
  subjectsResult: { data: [] as unknown[], error: null as Error | null },
  editaisResult: { data: [] as unknown[], error: null as Error | null },
  cycleResult: { data: [] as unknown[], error: null as Error | null },
  getUnifiedSubjectName: (_id: string, name: string) => name,
  getUnifiedTopicName: (_id: string, name: string) => name,
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/hooks/useTopicReview', () => ({ useTopicReview: () => ({ markTopicAsReviewed: vi.fn() }) }));
vi.mock('@/hooks/useDailySubjectsWithViews', () => ({ useDailySubjectsWithViews: () => [] }));
vi.mock('@/hooks/useMergeData', () => ({
  useMergeData: () => ({
    getUnifiedSubjectName: mocks.getUnifiedSubjectName,
    getUnifiedTopicName: mocks.getUnifiedTopicName,
  }),
}));
vi.mock('@/services/topicReviewService', () => ({ fetchTopicReviewStats: vi.fn(async () => new Map()) }));
vi.mock('@/services/cycleMergeService', () => ({ registerDualProgress: vi.fn() }));
vi.mock('@/contexts/utils/dataTransformers', () => ({ transformSubjectsData: () => [] }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const readResult = () => table === 'subjects'
        ? mocks.subjectsResult
        : table === 'user_editais'
          ? mocks.editaisResult
          : mocks.cycleResult;
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn(() => chain);
      chain.eq = vi.fn(() => chain);
      chain.order = vi.fn(() => chain);
      chain.limit = vi.fn(async () => readResult());
      chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve(readResult()).then(resolve, reject);
      return chain;
    }),
  },
}));

describe('useStudyCycleData load contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.subjectsResult = { data: [], error: null };
    mocks.editaisResult = { data: [], error: null };
    mocks.cycleResult = { data: [], error: null };
  });

  it('exposes a subject failure instead of treating the cycle as authoritatively empty', async () => {
    const error = new Error('subjects unavailable');
    mocks.subjectsResult = { data: [], error };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useStudyCycleData());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe(error);
    expect(result.current.studyCycleSubjects).toEqual([]);
    consoleError.mockRestore();
  });

  it('exposes a cycle failure and clears it only after a successful explicit retry', async () => {
    const error = new Error('cycle unavailable');
    mocks.cycleResult = { data: [], error };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useStudyCycleData());

    await waitFor(() => expect(result.current.error).toBe(error));
    mocks.cycleResult = { data: [], error: null };
    await act(async () => { await result.current.retryLoad(); });

    expect(result.current.error).toBeNull();
    expect(result.current.userCycle).toBeNull();
    expect(result.current.isLoading).toBe(false);
    consoleError.mockRestore();
  });
});
