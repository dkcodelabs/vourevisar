import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAccountSubscription: vi.fn(),
}));

vi.mock('@/services/accountSubscriptionService', () => ({
  getAccountSubscription: mocks.getAccountSubscription,
}));

import { useAccountSubscription } from './useAccountSubscription';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe('useAccountSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads account subscription through TanStack Query', async () => {
    const payload = {
      subscription: {
        plan: 'premium',
        status: 'active',
        billingType: 'CREDIT_CARD',
      },
      asaas: {
        available: false,
        unavailableReason: 'asaas_not_linked',
        subscription: null,
        payments: [],
      },
    };
    mocks.getAccountSubscription.mockResolvedValue(payload);

    const { result } = renderHook(() => useAccountSubscription(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(payload);
    expect(mocks.getAccountSubscription).toHaveBeenCalledOnce();
  });
});
