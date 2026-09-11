import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  logEvent: vi.fn(),
  useStripeBillingOverview: vi.fn(),
  useStripeCatalog: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/useUserLogger', () => ({
  useUserLogger: () => ({ logEvent: mocks.logEvent }),
}));

vi.mock('@/features/billing/hooks/useStripeBilling', () => ({
  useStripeBillingOverview: mocks.useStripeBillingOverview,
  useStripeCatalog: mocks.useStripeCatalog,
}));

import Planos from './Planos';

describe('Planos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mocks.useStripeCatalog.mockReturnValue({
      data: [
        { code: 'monthly', name: 'Mensal', amountCents: 1290, currency: 'brl', interval: 'month', metadata: {} },
        { code: 'annual', name: 'Anual', amountCents: 9990, currency: 'brl', interval: 'year', metadata: {} },
      ],
      isLoading: false,
      isError: false,
    });
  });

  it('explains an expired courtesy before showing prices', () => {
    mocks.useStripeBillingOverview.mockReturnValue({
      data: {
        is_active: false,
        source: 'none',
        plan: 'free_trial',
        status: 'inactive',
        access_until: null,
        subscription: null,
        last_expired_access: { kind: 'courtesy', ended_at: '2026-09-04T00:00:00Z' },
      },
      isLoading: false,
    });

    render(<MemoryRouter><Planos /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Sua cortesia terminou' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /escolha o ritmo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assinar mensal' })).toBeInTheDocument();
    expect(mocks.logEvent).toHaveBeenCalledWith('ACCESS_RECOVERY_VIEWED', { kind: 'courtesy_expired' });
  });

  it('does not sell another plan when the current payment needs recovery', () => {
    mocks.useStripeBillingOverview.mockReturnValue({
      data: {
        is_active: false,
        source: 'stripe',
        plan: 'monthly',
        status: 'unpaid',
        access_until: null,
        subscription: { status: 'unpaid', access_suspended_at: '2026-09-04T00:00:00Z' },
      },
      isLoading: false,
    });

    render(<MemoryRouter><Planos /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Regularizar pagamento' })).toHaveAttribute('href', '/conta/assinatura');
    expect(screen.queryByRole('button', { name: /assinar mensal/i })).not.toBeInTheDocument();
  });

  it('explains that a different signed-in account has no entitlement', () => {
    mocks.useStripeBillingOverview.mockReturnValue({
      data: {
        is_active: false,
        source: 'none',
        plan: 'free_trial',
        status: 'inactive',
        access_until: null,
        subscription: null,
      },
      isLoading: false,
    });

    render(<MemoryRouter><Planos /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Esta conta ainda não possui acesso' })).toBeInTheDocument();
    expect(screen.getByText(/plano, teste ou cortesia/i)).toBeInTheDocument();
    expect(screen.getByText(/outro e-mail/i)).toBeInTheDocument();
  });
});
