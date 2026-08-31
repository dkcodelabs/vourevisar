import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getPracticeOverview } from '@/features/practice/services/practiceService';
import { usePracticeOverview } from '@/features/practice/hooks/usePracticeOverview';

vi.mock('@/features/practice/services/practiceService', () => ({
  getPracticeOverview: vi.fn(),
}));

const getPracticeOverviewMock = vi.mocked(getPracticeOverview);
const overview = {
  scope: { status: 'active' as const, subjectIds: ['subject-1'], activeEditalCount: 1 },
  recommendedTopic: null,
  selectedTopic: null,
  materialTopics: [],
  flashcards: { dueCount: 0, dueTopicCount: 0 },
  dailyRecommendation: {
    kind: 'clear' as const,
    count: 0,
    topicCount: 0,
    reason: 'clear' as const,
    estimatedMinutes: 0,
  },
};

const createHarness = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

describe('usePracticeOverview', () => {
  beforeEach(() => {
    getPracticeOverviewMock.mockReset();
    getPracticeOverviewMock.mockResolvedValue(overview);
  });

  it('revalida a consulta ao voltar para o Treino', async () => {
    const { wrapper } = createHarness();
    const firstMount = renderHook(() => usePracticeOverview('user-1'), { wrapper });

    await waitFor(() => expect(getPracticeOverviewMock).toHaveBeenCalledTimes(1));
    firstMount.unmount();

    renderHook(() => usePracticeOverview('user-1'), { wrapper });
    await waitFor(() => expect(getPracticeOverviewMock).toHaveBeenCalledTimes(2));
  });

  it('revalida a fila após revisão e mudança de escopo', async () => {
    const { wrapper } = createHarness();
    const { unmount } = renderHook(() => usePracticeOverview('user-1'), { wrapper });
    await waitFor(() => expect(getPracticeOverviewMock).toHaveBeenCalledTimes(1));

    act(() => window.dispatchEvent(new CustomEvent('topicUpdated')));
    await waitFor(() => expect(getPracticeOverviewMock).toHaveBeenCalledTimes(2));

    act(() => window.dispatchEvent(new CustomEvent('cycleUpdated')));
    await waitFor(() => expect(getPracticeOverviewMock).toHaveBeenCalledTimes(3));

    unmount();
    act(() => window.dispatchEvent(new CustomEvent('mergeUpdated')));
    expect(getPracticeOverviewMock).toHaveBeenCalledTimes(3);
  });
});
