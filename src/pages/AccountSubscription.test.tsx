import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

const manualTrialWithHistoricalStripeSubscription: BillingOverview = {
  ...canceledOverview,
  is_active: true,
  source: 'manual',
  plan: 'free_trial',
  status: 'trial',
  access_until: '2026-08-10T00:00:00.000Z',
};

const activeOverview: BillingOverview = {
  ...canceledOverview,
  is_active: true,
  status: 'active',
  subscription: {
    ...canceledOverview.subscription!,
    status: 'active',
    canceled_at: null,
  },
};

const pendingOverview: BillingOverview = {
  ...activeOverview,
  status: 'past_due',
  subscription: {
    ...activeOverview.subscription!,
    status: 'past_due',
  },
};

const endingOverview: BillingOverview = {
  ...activeOverview,
  subscription: {
    ...activeOverview.subscription!,
    cancel_at: '2026-10-02T00:00:00.000Z',
  },
};

const suspendedOverview: BillingOverview = {
  ...activeOverview,
  is_active: false,
  status: 'unpaid',
  subscription: {
    ...activeOverview.subscription!,
    status: 'unpaid',
    access_suspended_at: '2026-10-03T00:00:00.000Z',
  },
};

describe('AccountSubscription', () => {
  afterEach(() => {
    cleanup();
  });

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

  it('does not present a historical Stripe plan or card as current during a manual trial', () => {
    mocks.useStripeBillingOverview.mockReturnValue({
      data: manualTrialWithHistoricalStripeSubscription,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/conta/assinatura']}>
        <AccountSubscription />
      </MemoryRouter>,
    );

    expect(screen.getByText('Teste gratuito')).toBeInTheDocument();
    expect(screen.getByText('Acesso gratuito')).toBeInTheDocument();
    expect(screen.getAllByText('Sem cobrança')).toHaveLength(1);
    expect(screen.getByText('Fim do período')).toBeInTheDocument();
    expect(screen.getByText('10 de agosto de 2026')).toBeInTheDocument();
    expect(screen.getByText('Nenhum cartão necessário')).toBeInTheDocument();
    expect(screen.queryByText(/VISA •••• 0341/i)).not.toBeInTheDocument();
    expect(screen.queryByText('R$ 16,00')).not.toBeInTheDocument();
    expect(screen.queryByText('por mês')).not.toBeInTheDocument();
  });

  it('renders an intentional loading state while the billing overview is still resolving', () => {
    mocks.useStripeBillingOverview.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/conta/assinatura']}>
        <AccountSubscription />
      </MemoryRouter>,
    );

    expect(screen.getByText('Carregando sua assinatura')).toBeInTheDocument();
    expect(screen.getByText('Organizando os dados do seu plano…')).toBeInTheDocument();
  });

  it('keeps billing lookup failures recoverable without exposing provider internals', () => {
    mocks.useStripeBillingOverview.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/conta/assinatura']}>
        <AccountSubscription />
      </MemoryRouter>,
    );

    expect(screen.getByText('Não conseguimos carregar sua assinatura')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
    expect(screen.queryByText(/stripe|webhook|paymentintent/i)).not.toBeInTheDocument();
  });

  it.each([
    ['ativo', activeOverview, 'Acesso ativo', 'Gerenciar pagamento'],
    ['pagamento pendente', pendingOverview, 'Pagamento pendente', 'Atualizar pagamento'],
    ['cancelamento programado', endingOverview, 'Renovação cancelada', 'Gerenciar assinatura'],
    ['acesso suspenso', suspendedOverview, 'Acesso suspenso', 'Regularizar pagamento'],
  ] as const)('renders the %s state with one clear recovery action', (_name, data, badge, action) => {
    mocks.useStripeBillingOverview.mockReturnValue({
      data,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/conta/assinatura']}>
        <AccountSubscription />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(badge).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: new RegExp(action, 'i') })).toBeInTheDocument();
  });
});
