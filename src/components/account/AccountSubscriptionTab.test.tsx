import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAccountSubscription: vi.fn(),
}));

vi.mock('@/hooks/useAccountSubscription', () => ({
  useAccountSubscription: mocks.useAccountSubscription,
}));

import { AccountSubscriptionTab } from './AccountSubscriptionTab';

describe('AccountSubscriptionTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows local subscription and recent Asaas payments in read-only mode', () => {
    mocks.useAccountSubscription.mockReturnValue({
      data: {
        subscription: {
          plan: 'premium',
          status: 'active',
          billingType: 'CREDIT_CARD',
          subscriptionStartedAt: '2026-07-01',
          nextBillingDate: '2026-08-01',
        },
        asaas: {
          available: true,
          subscription: {
            status: 'ACTIVE',
            value: 49.9,
            cycle: 'MONTHLY',
            billingType: 'CREDIT_CARD',
            nextDueDate: '2026-08-01',
          },
          payments: [
            {
              id: 'pay-1',
              status: 'RECEIVED',
              value: 49.9,
              dueDate: '2026-07-01',
              paymentDate: '2026-07-01',
              billingType: 'CREDIT_CARD',
            },
          ],
        },
      },
      error: null,
      isError: false,
      isLoading: false,
      isFetching: false,
    });

    render(<AccountSubscriptionTab />);

    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getAllByText('Ativa').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Cartão de crédito').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/R\$\s*49,90/)).toHaveLength(2);
    expect(screen.getByText('Pagamento recebido')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancelar|trocar|segunda via/i })).not.toBeInTheDocument();
  });

  it('keeps billing data visibly degraded when Asaas is unavailable', () => {
    mocks.useAccountSubscription.mockReturnValue({
      data: {
        subscription: {
          plan: 'free',
          status: 'trial',
          billingType: null,
        },
        asaas: {
          available: false,
          unavailableReason: 'asaas_not_linked',
          subscription: null,
          payments: [],
        },
      },
      error: null,
      isError: false,
      isLoading: false,
      isFetching: false,
    });

    render(<AccountSubscriptionTab />);

    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Dados de cobrança indisponíveis')).toBeInTheDocument();
    expect(screen.getByText('Sua assinatura ainda não tem vínculo de cobrança no Asaas.')).toBeInTheDocument();
  });
});
