import type { ComponentType, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useStripeCatalog: vi.fn(),
  getSafeBillingErrorMessage: vi.fn(),
  isBillingError: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQuery,
}));

vi.mock('@stripe/react-stripe-js/checkout', () => ({
  CheckoutElementsProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(),
}));

vi.mock('@/features/billing/hooks/useStripeBilling', () => ({
  useStripeCatalog: mocks.useStripeCatalog,
}));

vi.mock('@/features/billing/services/stripeBillingService', () => ({
  createStripeCheckout: vi.fn(),
  formatBillingPrice: vi.fn(),
  getSafeBillingErrorMessage: mocks.getSafeBillingErrorMessage,
  isBillingError: mocks.isBillingError,
}));

vi.mock('@/features/billing/components/BillingShell', () => ({
  BillingShell: ({ children, title, description }: { children: ReactNode; title: string; description: string }) => (
    <main>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </main>
  ),
}));

vi.mock('@/features/billing/components/StripePaymentForm', () => ({
  StripePaymentForm: () => <div>Pagamento</div>,
}));

let StripeCheckout: ComponentType;

beforeAll(async () => {
  vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_checkout_ui');
  ({ default: StripeCheckout } = await import('./StripeCheckout'));
});

describe('StripeCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useStripeCatalog.mockReturnValue({
      data: [{ code: 'monthly', amountCents: 1290, currency: 'brl' }],
      isError: false,
      isLoading: false,
    });
    mocks.useQuery.mockReturnValue({
      data: undefined,
      error: new Error('Seu plano já está ativo. Acesse Minha assinatura para gerenciá-lo.'),
      isError: true,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.getSafeBillingErrorMessage.mockReturnValue(
      'Seu plano já está ativo. Acesse Minha assinatura para gerenciá-lo.',
    );
    mocks.isBillingError.mockReturnValue(true);
  });

  it('directs an already subscribed student to the account instead of retrying checkout', () => {
    render(
      <MemoryRouter initialEntries={['/checkout?plan=monthly']}>
        <StripeCheckout />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Seu plano já está ativo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para Minha assinatura' })).toHaveAttribute(
      'href',
      '/conta/assinatura',
    );
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });
});
