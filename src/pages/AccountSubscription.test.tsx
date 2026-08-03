import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BillingOverview } from '@/features/billing/types';

const mocks = vi.hoisted(() => ({
  useStripeBillingOverview: vi.fn(),
  useStripeInvoiceHistory: vi.fn(),
  useStripePortal: vi.fn(),
  useUserRole: vi.fn(),
}));

vi.mock('@/features/billing/hooks/useStripeBilling', () => ({
  useStripeBillingOverview: mocks.useStripeBillingOverview,
  useStripeInvoiceHistory: mocks.useStripeInvoiceHistory,
  useStripePortal: mocks.useStripePortal,
}));

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: mocks.useUserRole,
}));

vi.mock('@/features/billing/components/BillingArtwork', () => ({
  BillingArtwork: ({ nextStep }: { nextStep?: string }) => <div>{nextStep}</div>,
}));

import AccountSubscription from './AccountSubscription';

const canceledOverview: BillingOverview = {
  is_active: false,
  source: 'stripe',
  plan: 'monthly',
  status: 'canceled',
  access_until: '2026-10-02T00:00:00.000Z',
  subscription: {
    plan: 'monthly',
    status: 'canceled',
    amount_cents: 1600,
    currency: 'brl',
    billing_interval: 'month',
    current_period_start: '2026-09-02T00:00:00.000Z',
    current_period_end: '2026-10-02T00:00:00.000Z',
    cancel_at_period_end: false,
    cancel_at: null,
    canceled_at: '2026-09-17T00:00:00.000Z',
    scheduled_plan: null,
    card_brand: 'visa',
    card_last4: '0341',
    access_suspended_at: null,
    access_suspension_reason: null,
    updated_at: '2026-09-17T00:00:00.000Z',
  },
};

describe('AccountSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useStripeBillingOverview.mockReturnValue({
      data: canceledOverview,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.useStripePortal.mockReturnValue({
      isPending: false,
      isError: false,
      mutateAsync: vi.fn(),
    });
    mocks.useStripeInvoiceHistory.mockReturnValue({
      data: [{ status: 'closed', amount_cents: 1600, currency: 'brl', occurred_at: '2026-09-02T00:00:00.000Z' }],
      isLoading: false,
      isError: false,
    });
    mocks.useUserRole.mockReturnValue({
      isAdmin: false,
      isOwner: false,
      loading: false,
    });
  });

  it('renders a terminated subscription as a recovery state, not a renewal', () => {
    render(
      <MemoryRouter initialEntries={['/conta/assinatura']}>
        <AccountSubscription />
      </MemoryRouter>,
    );

    expect(screen.getByText('Assinatura encerrada')).toBeInTheDocument();
    expect(screen.getByText('Sem renovação ativa')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /escolher novo plano/i })).toHaveAttribute('href', '/planos');
    expect(screen.getByRole('button', { name: /ver histórico financeiro/i })).toBeInTheDocument();
    expect(screen.getByText('Cobrança encerrada')).toBeInTheDocument();
    expect(screen.getByText('Retomar assinatura')).toBeInTheDocument();
    expect(screen.queryByText('Próxima renovação')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /gerenciar pagamento/i })).not.toBeInTheDocument();
  });

  it('keeps terminated-account history inside the product without opening the payment portal', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(
      <MemoryRouter initialEntries={['/conta/assinatura']}>
        <AccountSubscription />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /ver histórico financeiro/i }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(mocks.useStripePortal().mutateAsync).not.toHaveBeenCalled();
  });
});
