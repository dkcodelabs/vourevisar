import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCycleStatistics } from '@/hooks/useCycleStatistics';
import { fetchCycleStatisticsSource } from '@/services/cycleStatisticsService';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/services/cycleStatisticsService', () => ({
  fetchCycleStatisticsSource: vi.fn(),
}));

const fetchCycleStatisticsSourceMock = vi.mocked(fetchCycleStatisticsSource);

describe('useCycleStatistics', () => {
  beforeEach(() => {
    fetchCycleStatisticsSourceMock.mockReset();
    fetchCycleStatisticsSourceMock.mockResolvedValue({
      cycle: null,
      editalNames: [],
      topics: [],
      subjects: [],
      sessions: [],
    });
  });

  it('revalida um estado vazio recente ao voltar para a página', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    queryClient.setQueryData(['cycle-statistics', 'user-1', 7], null);

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useCycleStatistics(7), { wrapper });

    await waitFor(() => {
      expect(fetchCycleStatisticsSourceMock).toHaveBeenCalledWith({
        userId: 'user-1',
        period: 7,
      });
    });
  });
});
