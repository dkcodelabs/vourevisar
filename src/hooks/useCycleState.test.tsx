import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCycleState } from './useCycleState';

const mocks = vi.hoisted(() => ({
  user: { id: 'user-1' },
  result: { data: null as unknown[] | null, error: null as Error | null },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        limit: vi.fn(async () => mocks.result),
      };
      return chain;
    }),
  },
}));

describe('useCycleState load contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.result = { data: null, error: null };
  });

  it('exposes a failed cycle read instead of making null look authoritative', async () => {
    const error = new Error('cycle unavailable');
    mocks.result = { data: null, error };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useCycleState());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.userCycle).toBeNull();
    expect(result.current.error).toBe(error);
    consoleError.mockRestore();
  });

  it('clears the load error after a successful retry', async () => {
    mocks.result = { data: null, error: new Error('temporary failure') };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useCycleState());
    await waitFor(() => expect(result.current.error).toBeTruthy());

    mocks.result = { data: [], error: null };
    await act(async () => { await result.current.fetchUserCycle(); });

    expect(result.current.error).toBeNull();
    expect(result.current.userCycle).toBeNull();
    expect(result.current.isLoading).toBe(false);
    consoleError.mockRestore();
  });
});
