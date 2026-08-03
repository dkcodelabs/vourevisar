import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  clearCheckoutRequestIds: vi.fn(),
  refetch: vi.fn(),
  useStripeBillingOverview: vi.fn(),
}));

vi.mock('@/features/billing/hooks/useStripeBilling', () => ({
  useStripeBillingOverview: mocks.useStripeBillingOverview,
}));

vi.mock('@/features/billing/utils/checkoutRequest', () => ({
  clearCheckoutRequestIds: mocks.clearCheckoutRequestIds,
}));

vi.mock('@/features/billing/components/BillingShell', () => ({
  BillingShell: ({
    children,
    description,
    eyebrow,
    title,
  }: {
    children: React.ReactNode;
    description: string;
    eyebrow: string;
    title: string;
  }) => (
    <main>
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </main>
  ),
}));

import StripeCheckoutReturn from './StripeCheckoutReturn';

const renderPage = (route = '/checkout/retorno?session_id=cs_test_123') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <StripeCheckoutReturn />
    </MemoryRouter>,
  );

describe('StripeCheckoutReturn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('celebrates the activated plan and leads the student back to studying', () => {
    mocks.useStripeBillingOverview.mockReturnValue({
      data: { is_active: true, source: 'stripe' },
      refetch: mocks.refetch,
    });

    renderPage();

    expect(screen.getByText('Assinatura ativada')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Seu plano está ativo. Agora é hora de avançar.' })).toBeInTheDocument();
    expect(screen.getByText(/seu acesso já está liberado/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /continuar meus estudos/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByText(/webhook|ativações falsas|duplicadas/i)).not.toBeInTheDocument();
    expect(mocks.clearCheckoutRequestIds).toHaveBeenCalledOnce();
  });

  it('uses reassuring language while activation is still processing', () => {
    mocks.useStripeBillingOverview.mockReturnValue({
      data: { is_active: false, source: 'stripe' },
      refetch: mocks.refetch,
    });

    renderPage();

    expect(screen.getByText('Confirmação em andamento')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Estamos confirmando seu pagamento.' })).toBeInTheDocument();
    expect(screen.getByText(/não precisa repetir a compra/i)).toBeInTheDocument();
    expect(screen.queryByText(/webhook|canal seguro|ativações falsas|duplicadas/i)).not.toBeInTheDocument();
  });

  it('does not claim that a payment exists when the return route is opened directly', () => {
    mocks.useStripeBillingOverview.mockReturnValue({
      data: { is_active: false, source: 'trial' },
      refetch: mocks.refetch,
    });

    renderPage('/checkout/retorno');

    expect(screen.getByText('Minha assinatura')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Consulte o status do seu plano.' })).toBeInTheDocument();
    expect(screen.getByText(/nenhum pagamento foi confirmado nesta página/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver status da assinatura/i })).toHaveAttribute('href', '/conta/assinatura');
    expect(mocks.refetch).not.toHaveBeenCalled();
    expect(screen.queryByText(/pagamento aprovado|assinatura ativada/i)).not.toBeInTheDocument();
  });
});
