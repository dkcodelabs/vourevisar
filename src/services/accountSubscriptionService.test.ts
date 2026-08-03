import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: mocks.invoke,
    },
  },
}));

import { cancelAccountRenewal, getAccountSubscription } from './accountSubscriptionService';

describe('getAccountSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the authenticated account subscription from the student Edge Function', async () => {
    const payload = {
      subscription: {
        plan: 'premium',
        status: 'active',
        billingType: 'PIX',
        nextBillingDate: '2026-08-10',
      },
      asaas: {
        available: true,
        subscription: {
          status: 'ACTIVE',
          value: 49.9,
          cycle: 'MONTHLY',
          billingType: 'PIX',
          nextDueDate: '2026-08-10',
        },
        payments: [
          {
            id: 'pay-1',
            status: 'RECEIVED',
            value: 49.9,
            dueDate: '2026-07-10',
            paymentDate: '2026-07-09',
            billingType: 'PIX',
          },
        ],
      },
    };

    mocks.invoke.mockResolvedValue({
      data: { success: true, data: payload },
      error: null,
    });

    await expect(getAccountSubscription()).resolves.toEqual(payload);
    expect(mocks.invoke).toHaveBeenCalledWith('asaas-account', {
      body: { action: 'get_account_subscription' },
    });
  });

  it('throws the function message when account billing data cannot be loaded', async () => {
    mocks.invoke.mockResolvedValue({
      data: { success: false, error: 'Sessao invalida' },
      error: null,
    });

    await expect(getAccountSubscription()).rejects.toThrow('Sessao invalida');
  });
});

describe('cancelAccountRenewal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests cancellation through the authenticated account function', async () => {
    mocks.invoke.mockResolvedValue({ data: { success: true }, error: null });

    await expect(cancelAccountRenewal()).resolves.toBeUndefined();
    expect(mocks.invoke).toHaveBeenCalledWith('asaas-account', {
      body: { action: 'cancel_renewal' },
    });
  });

  it('surfaces a cancellation error from the function', async () => {
    mocks.invoke.mockResolvedValue({
      data: { success: false, error: 'A assinatura não está ativa no Asaas.' },
      error: null,
    });

    await expect(cancelAccountRenewal()).rejects.toThrow('A assinatura não está ativa no Asaas.');
  });
});
