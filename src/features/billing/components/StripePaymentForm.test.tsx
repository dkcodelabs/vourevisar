import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StripePaymentForm } from '@/features/billing/components/StripePaymentForm';

const mocks = vi.hoisted(() => ({
  acceptContract: vi.fn(),
  confirmCheckout: vi.fn(),
  applyPromotionCode: vi.fn(),
  removePromotionCode: vi.fn(),
}));

vi.mock('@stripe/react-stripe-js/checkout', () => ({
  PaymentElement: () => <div data-testid="payment-element" />,
  useCheckoutElements: () => ({
    type: 'success',
    checkout: {
      confirm: mocks.confirmCheckout,
      applyPromotionCode: mocks.applyPromotionCode,
      removePromotionCode: mocks.removePromotionCode,
      currency: 'brl',
      minorUnitsAmountDivisor: 100,
      total: { total: { minorUnitsAmount: 9990, amount: 'R$ 99,90' } },
      discountAmounts: null,
    },
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
    mocks.applyPromotionCode.mockReset().mockResolvedValue({ type: 'success' });
    mocks.removePromotionCode.mockReset().mockResolvedValue({ type: 'success' });
  });

  it('applies a promotion code through Stripe Checkout instead of calculating a discount locally', async () => {
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

    fireEvent.change(screen.getByPlaceholderText('Digite seu código'), {
      target: { value: 'vrtteste20' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    await waitFor(() => expect(mocks.applyPromotionCode).toHaveBeenCalledWith('VRTTESTE20'));
    expect(screen.getByText('Desconto aplicado ao pagamento de hoje.')).toBeVisible();
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
    expect(screen.getByRole('link', { name: 'Termos de Uso' })).not.toHaveAttribute('target');
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).not.toHaveAttribute('target');
    expect(screen.getByRole('link', { name: 'Política de Cancelamento e Reembolso' })).not.toHaveAttribute('target');
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
