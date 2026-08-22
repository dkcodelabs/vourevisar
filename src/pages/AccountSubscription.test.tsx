import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BillingOverview } from '@/features/billing/types';

const mocks = vi.hoisted(() => ({
  useStripeBillingOverview: vi.fn(),
  useStripeCatalog: vi.fn(),
  useStripeInvoiceHistory: vi.fn(),
  useStripePortal: vi.fn(),
  useStripeWithdrawal: vi.fn(),
  useStripeWithdrawalResultEmail: vi.fn(),
  useScheduleStripeAnnualPlanChange: vi.fn(),
  useCancelStripeScheduledPlanChange: vi.fn(),
  useUserRole: vi.fn(),
}));

vi.mock('@/features/billing/hooks/useStripeBilling', () => ({
  useStripeBillingOverview: mocks.useStripeBillingOverview,
  useStripeCatalog: mocks.useStripeCatalog,
  useStripeInvoiceHistory: mocks.useStripeInvoiceHistory,
  useStripePortal: mocks.useStripePortal,
  useStripeWithdrawal: mocks.useStripeWithdrawal,
  useStripeWithdrawalResultEmail: mocks.useStripeWithdrawalResultEmail,
  useScheduleStripeAnnualPlanChange: mocks.useScheduleStripeAnnualPlanChange,
  useCancelStripeScheduledPlanChange: mocks.useCancelStripeScheduledPlanChange,
}));

vi.mock('@/features/billing/legal/billingLegalDocuments', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/features/billing/legal/billingLegalDocuments')>();
  return {
    ...original,
    isBillingWithdrawalEnabled: () => true,
    isBillingPlanChangeEnabled: () => true,
  };
});

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

const withdrawalEligibleOverview: BillingOverview = {
  ...activeOverview,
  withdrawal: {
    eligible: true,
    deadline: '2026-09-09T12:00:00.000Z',
    status: null,
    requested_at: null,
    result_at: null,
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
    mocks.useStripeWithdrawal.mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mocks.useStripeWithdrawalResultEmail.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
      data: undefined,
    });
    mocks.useScheduleStripeAnnualPlanChange.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    });
    mocks.useCancelStripeScheduledPlanChange.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    });
    mocks.useStripeCatalog.mockReturnValue({
      data: [
        { code: 'monthly', name: 'Mensal', amountCents: 1290, currency: 'brl', interval: 'month', metadata: {} },
        { code: 'annual', name: 'Anual', amountCents: 9990, currency: 'brl', interval: 'year', metadata: {} },
      ],
      isLoading: false,
    });
    mocks.useStripeInvoiceHistory.mockReturnValue({
      data: [{
        status: 'refunded',
        amount_cents: 1600,
        currency: 'brl',
        occurred_at: '2026-09-02T00:00:00.000Z',
        status_at: '2026-09-17T00:00:00.000Z',
      }],
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
    expect(screen.queryByRole('button', { name: /ver histórico financeiro/i })).not.toBeInTheDocument();
    expect(screen.getByText('Reembolso confirmado pela Stripe')).toBeInTheDocument();
    expect(screen.getByText(/reembolso atualizado em 17 de set\. de 2026/i)).toBeInTheDocument();
    expect(screen.getByText('Retomar assinatura')).toBeInTheDocument();
    expect(screen.queryByText('Próxima renovação')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /gerenciar pagamento/i })).not.toBeInTheDocument();
  });

  it('keeps the financial history available while a Stripe subscription is active', () => {
    mocks.useStripeBillingOverview.mockReturnValue({
      data: activeOverview,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/conta/assinatura']}>
        <AccountSubscription />
      </MemoryRouter>,
    );

    expect(mocks.useStripeInvoiceHistory).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole('heading', { name: 'Histórico financeiro' })).toBeInTheDocument();
    expect(screen.getByText('Reembolso confirmado pela Stripe')).toBeInTheDocument();
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
    expect(screen.getByText('R$ 16,00')).toBeInTheDocument();
    expect(screen.getByText('Reembolso confirmado pela Stripe')).toBeInTheDocument();
    expect(screen.queryByText('por mês')).not.toBeInTheDocument();
  });

  it('turns an active trial into a direct, price-backed checkout choice', () => {
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

    expect(screen.getByRole('heading', { name: /escolha seu plano agora/i })).toBeInTheDocument();
    expect(screen.getByText(/economize R\$ 54,90 no ano/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /assinar anual/i })).toHaveAttribute('href', '/checkout?plan=annual&from=subscription');
    expect(screen.getByRole('link', { name: /mensal.*assinar/i })).toHaveAttribute('href', '/checkout?plan=monthly&from=subscription');
    expect(screen.getByRole('link', { name: /continuar no teste gratuito/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByRole('link', { name: /^ver planos/i })).not.toBeInTheDocument();
  });

  it('restores only the original trial while preserving the refunded payment history', () => {
    mocks.useStripeBillingOverview.mockReturnValue({
      data: {
        ...manualTrialWithHistoricalStripeSubscription,
        source: 'trial',
        withdrawal: {
          eligible: false,
          deadline: '2026-08-28T12:00:00.000Z',
          status: 'succeeded',
          requested_at: '2026-08-21T12:00:00.000Z',
          result_at: '2026-08-21T12:00:02.000Z',
        },
      },
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
    expect(screen.getAllByText('Reembolso confirmado pela Stripe').length).toBeGreaterThan(0);
    expect(screen.queryByText(/VISA •••• 0341/i)).not.toBeInTheDocument();
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

  it('shows the self-service withdrawal action only when the sanitized overview allows it', () => {
    mocks.useStripeBillingOverview.mockReturnValue({
      data: withdrawalEligibleOverview,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/conta/assinatura']}>
        <AccountSubscription />
      </MemoryRouter>,
    );

    expect(screen.getByText('Mudou de ideia?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar compra e pedir reembolso/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /atualizar cartão/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/plano anual disponível após o prazo de arrependimento/i)).not.toBeInTheDocument();
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

  it('explains that a scheduled cancellation neither renews nor requests a refund', () => {
    mocks.useStripeBillingOverview.mockReturnValue({
      data: endingOverview,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/conta/assinatura']}>
        <AccountSubscription />
      </MemoryRouter>,
    );

    expect(screen.getByText(/não haverá nova cobrança/i)).toBeInTheDocument();
    expect(screen.getByText(/não solicitou reembolso/i)).toBeInTheDocument();
    expect(screen.getByText(/você mantém acesso até 02 de outubro de 2026/i)).toBeInTheDocument();
  });
});
