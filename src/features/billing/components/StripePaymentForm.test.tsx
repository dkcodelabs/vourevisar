import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StripePaymentForm } from '@/features/billing/components/StripePaymentForm';

const mocks = vi.hoisted(() => ({
  acceptContract: vi.fn(),
  confirmCheckout: vi.fn(),
}));

vi.mock('@stripe/react-stripe-js/checkout', () => ({
  PaymentElement: () => <div data-testid="payment-element" />,
  useCheckoutElements: () => ({
    type: 'success',
    checkout: { confirm: mocks.confirmCheckout },
  }),
}));

vi.mock('@/features/billing/hooks/useStripeBilling', () => ({
  useStripeContractAcceptance: () => ({
    mutateAsync: mocks.acceptContract,
    isPending: false,
  }),
}));

describe('StripePaymentForm contract acceptance', () => {
  beforeEach(() => {
    mocks.acceptContract.mockReset().mockResolvedValue({ accepted: true });
    mocks.confirmCheckout.mockReset().mockResolvedValue({ type: 'success' });
  });

  it('blocks payment until the contract is accepted', () => {
    render(
      <MemoryRouter>
        <StripePaymentForm
          priceLabel="R$ 99,90"
          intervalLabel="por ano"
          plan="annual"
          requestId="dbb35516-6e35-48dd-95e4-f704529dc515"
          requireContractAcceptance
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /assinar e começar/i })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos');
    expect(screen.getByText(/próxima cobrança estimada em/i)).toBeVisible();
  });

  it('persists evidence before asking Stripe to confirm the payment', async () => {
    const callOrder: string[] = [];
    mocks.acceptContract.mockImplementation(async () => {
      callOrder.push('accept');
      return { accepted: true };
    });
    mocks.confirmCheckout.mockImplementation(async () => {
      callOrder.push('confirm');
      return { type: 'success' };
    });

    render(
      <MemoryRouter>
        <StripePaymentForm
          priceLabel="R$ 12,90"
          intervalLabel="por mês"
          plan="monthly"
          requestId="9b869612-f4dc-4e69-b510-83500ec70643"
          requireContractAcceptance
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /assinar e começar/i }));

    await waitFor(() => expect(mocks.confirmCheckout).toHaveBeenCalledOnce());
    expect(mocks.acceptContract).toHaveBeenCalledWith('9b869612-f4dc-4e69-b510-83500ec70643');
    expect(callOrder).toEqual(['accept', 'confirm']);
  });
});
