import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScheduledAnnualPlanChange } from '@/features/billing/components/ScheduledAnnualPlanChange';

const scheduleMutation = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  isPending: false,
  isError: false,
  error: null as Error | null,
}));

const cancelMutation = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  isPending: false,
  isError: false,
  error: null as Error | null,
}));

vi.mock('@/features/billing/hooks/useStripeBilling', () => ({
  useScheduleStripeAnnualPlanChange: () => scheduleMutation,
  useCancelStripeScheduledPlanChange: () => cancelMutation,
}));

const renderPanel = (scheduled = false) => render(
  <MemoryRouter>
    <ScheduledAnnualPlanChange
      currentPeriodEnd="2026-09-21T00:00:00.000Z"
      scheduled={scheduled}
      annualPriceLabel="R$ 99,90"
    />
  </MemoryRouter>,
);

describe('ScheduledAnnualPlanChange', () => {
  beforeEach(() => {
    scheduleMutation.mutateAsync.mockReset().mockResolvedValue({
      scheduled: true,
      effectiveAt: '2026-09-21T00:00:00.000Z',
    });
    scheduleMutation.isPending = false;
    scheduleMutation.isError = false;
    scheduleMutation.error = null;
    cancelMutation.mutateAsync.mockReset().mockResolvedValue({
      scheduled: false,
      effectiveAt: '2026-09-21T00:00:00.000Z',
    });
    cancelMutation.isPending = false;
    cancelMutation.isError = false;
    cancelMutation.error = null;
  });

  it('requires explicit confirmation and makes the deferred charge clear', async () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /agendar plano anual/i }));

    expect(screen.getByRole('heading', { name: /agendar mudança para o plano anual/i })).toBeVisible();
    expect(screen.getByText(/não há cobrança hoje/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /confirmar agendamento/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /confirmar agendamento/i }));

    await waitFor(() => expect(scheduleMutation.mutateAsync).toHaveBeenCalledOnce());
    expect(scheduleMutation.mutateAsync.mock.calls[0][0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('lets the customer cancel a scheduled change without canceling the monthly subscription', async () => {
    renderPanel(true);

    expect(screen.getByText(/seu mensal permanece ativo/i)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /cancelar troca agendada/i }));

    await waitFor(() => expect(cancelMutation.mutateAsync).toHaveBeenCalledOnce());
  });
});
