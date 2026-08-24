import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BillingInvoiceHistory } from './BillingInvoiceHistory';

describe('BillingInvoiceHistory', () => {
  it('distinguishes a refunded payment from a merely paid invoice', () => {
    render(
      <BillingInvoiceHistory
        invoices={[{
          status: 'refunded',
          amount_cents: 1290,
          currency: 'brl',
          occurred_at: '2026-08-21T18:47:51.000Z',
          status_at: '2026-08-21T19:03:42.000Z',
          payment_method_label: 'VISA •••• 5137',
        }]}
        isLoading={false}
        isError={false}
      />,
    );

    expect(screen.getByText('Reembolso confirmado pela Stripe')).toBeVisible();
    expect(screen.getByText(/o banco pode exibir um crédito ou remover o lançamento original/i)).toBeVisible();
    expect(screen.queryByText('Pagamento confirmado')).not.toBeInTheDocument();
    expect(screen.getByText(/cobrado em 21 de ago\. de 2026/i)).toBeVisible();
    expect(screen.getByText(/reembolso atualizado em 21 de ago\. de 2026/i)).toBeVisible();
    expect(screen.getByText('Pago com VISA •••• 5137')).toBeVisible();
  });

  it('keeps an in-flight refund visible without claiming completion', () => {
    render(
      <BillingInvoiceHistory
        invoices={[{
          status: 'refund_pending',
          amount_cents: 1290,
          currency: 'brl',
          occurred_at: '2026-08-21T18:47:51.000Z',
          status_at: '2026-08-21T19:03:42.000Z',
          payment_method_label: null,
        }]}
        isLoading={false}
        isError={false}
      />,
    );

    expect(screen.getByText('Reembolso em processamento')).toBeVisible();
    expect(screen.queryByText('Reembolso confirmado pela Stripe')).not.toBeInTheDocument();
  });
});
