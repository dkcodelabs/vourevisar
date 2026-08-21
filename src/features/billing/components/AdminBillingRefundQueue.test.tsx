import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminBillingRefundQueue } from '@/features/billing/components/AdminBillingRefundQueue';
import type { AdminRefundRequest } from '@/features/billing/services/adminBillingService';

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  mutateAsync: vi.fn(),
  query: {
    data: [] as AdminRefundRequest[],
    isLoading: false,
    isError: false,
    isFetching: false,
  },
  mutation: {
    isPending: false,
  },
}));

vi.mock('@/features/billing/hooks/useAdminBilling', () => ({
  useAdminRefundRequests: () => ({ ...mocks.query, refetch: mocks.refetch }),
  useReconcileAdminRefundRequest: () => ({
    ...mocks.mutation,
    mutateAsync: mocks.mutateAsync,
  }),
}));

vi.mock('@/lib/toast', () => ({ toast: { success: vi.fn() } }));
vi.mock('@/lib/errors/toastGate', () => ({ toastGate: { notifyError: vi.fn() } }));

const manualReviewRequest: AdminRefundRequest = {
  id: '1c3c510b-4ad7-4620-9f38-c6108c2a7a07',
  user_id: '9f878df6-3bd0-4602-a54a-0b4e450217de',
  user_email: 'aluno@example.com',
  user_name: 'Aluno Teste',
  plan: 'annual',
  status: 'manual_review',
  subscription_cancel_status: 'succeeded',
  requested_at: '2026-08-21T12:00:00.000Z',
  amount_cents: 9990,
  currency: 'brl',
  error_code: 'admin_reconciliation_refund_not_found',
  processed_at: null,
  updated_at: '2026-08-21T12:05:00.000Z',
  processing_attempts: 1,
};

describe('AdminBillingRefundQueue', () => {
  beforeEach(() => {
    mocks.refetch.mockReset();
    mocks.mutateAsync.mockReset().mockResolvedValue([]);
    mocks.query.data = [manualReviewRequest];
    mocks.query.isLoading = false;
    mocks.query.isError = false;
    mocks.query.isFetching = false;
    mocks.mutation.isPending = false;
  });

  it('shows a mode-safe operational queue without provider identifiers', () => {
    render(<AdminBillingRefundQueue />);

    expect(screen.getByText('Reembolsos e arrependimentos')).toBeVisible();
    expect(screen.getByText('Aluno Teste')).toBeVisible();
    expect(screen.getByText(/R\$ 99,90/)).toBeVisible();
    expect(screen.getByText('admin_reconciliation_refund_not_found')).toBeVisible();
    expect(screen.queryByText(/pi_|re_|sub_/i)).not.toBeInTheDocument();
  });

  it('requires an audited reason and reuses one opaque action id', async () => {
    render(<AdminBillingRefundQueue />);

    fireEvent.click(screen.getByRole('button', { name: 'Reconciliar estado' }));
    expect(screen.getByText(/nenhum novo reembolso será criado/i)).toBeVisible();

    const confirm = screen.getByRole('button', { name: 'Confirmar reconciliação' });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Motivo operacional'), {
      target: { value: 'Conferência após falha do webhook.' },
    });
    fireEvent.click(confirm);

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledOnce());
    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      refundRequestId: manualReviewRequest.id,
      actionRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/i),
      reason: 'Conferência após falha do webhook.',
    });
  });

  it('does not offer reconciliation for a concluded refund', () => {
    mocks.query.data = [{ ...manualReviewRequest, status: 'succeeded', error_code: null }];
    render(<AdminBillingRefundQueue />);

    expect(screen.getByText('Confirmado')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Reconciliar estado' })).not.toBeInTheDocument();
  });

  it('does not race a recently started automatic processor', () => {
    mocks.query.data = [{
      ...manualReviewRequest,
      status: 'processing',
      updated_at: new Date().toISOString(),
    }];
    render(<AdminBillingRefundQueue />);

    expect(screen.getByText('Processando')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Reconciliar estado' })).not.toBeInTheDocument();
  });
});
