import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingWithdrawalPanel } from '@/features/billing/components/BillingWithdrawalPanel';
import type { BillingWithdrawal } from '@/features/billing/types';

const mutation = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  isPending: false,
  isError: false,
  error: null as Error | null,
  data: undefined as { status: 'processing' | 'succeeded' | 'manual_review' } | undefined,
}));

vi.mock('@/features/billing/hooks/useStripeBilling', () => ({
  useStripeWithdrawal: () => mutation,
}));

const eligibleWithdrawal: BillingWithdrawal = {
  eligible: true,
  deadline: '2026-08-28T12:00:00.000Z',
  status: null,
  requested_at: null,
  result_at: null,
};

const renderPanel = (withdrawal = eligibleWithdrawal) => render(
  <MemoryRouter>
    <BillingWithdrawalPanel withdrawal={withdrawal} amountLabel="R$ 99,90" />
  </MemoryRouter>,
);

describe('BillingWithdrawalPanel', () => {
  beforeEach(() => {
    mutation.mutateAsync.mockReset().mockResolvedValue({
      received: true,
      reused: false,
      status: 'processing',
    });
    mutation.isPending = false;
    mutation.isError = false;
    mutation.error = null;
    mutation.data = undefined;
  });

  it('shows the effects and requires a final explicit confirmation', async () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /desistir da assinatura/i }));
    expect(screen.getByText(/reembolso integral de R\$ 99,90/i)).toBeVisible();
    expect(screen.getByText(/acesso pago será encerrado/i)).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    await waitFor(() => expect(mutation.mutateAsync).toHaveBeenCalledOnce());
    expect(mutation.mutateAsync.mock.calls[0][0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('distinguishes processing from a completed refund', () => {
    renderPanel({
      ...eligibleWithdrawal,
      eligible: false,
      status: 'pending',
      requested_at: '2026-08-21T12:00:00.000Z',
    });

    expect(screen.getByRole('heading', { name: 'Solicitação recebida' })).toBeVisible();
    expect(screen.getByText(/reembolso está em processamento/i)).toBeVisible();
    expect(screen.queryByText('Reembolso confirmado')).not.toBeInTheDocument();
  });

  it('keeps a failed refund visible and routes the user to support', () => {
    renderPanel({
      ...eligibleWithdrawal,
      eligible: false,
      status: 'manual_review',
      requested_at: '2026-08-21T12:00:00.000Z',
    });

    expect(screen.getByRole('heading', { name: /precisamos concluir/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /canais de atendimento/i })).toHaveAttribute('href', '/contato');
  });
});
