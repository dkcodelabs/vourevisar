import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequireActiveSubscription } from './RequireActiveSubscription';
import { useUserAccess } from '@/hooks/useUserAccess';

vi.mock('@/hooks/useUserAccess', () => ({
  useUserAccess: vi.fn(),
}));

vi.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => (
    <div>{message || 'Carregando'}</div>
  ),
}));

const mockedUseUserAccess = vi.mocked(useUserAccess);

function renderGuardedRoute() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <RequireActiveSubscription>
              <div>Conteudo protegido</div>
            </RequireActiveSubscription>
          }
        />
        <Route path="/planos" element={<div>Pagina de planos</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireActiveSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not redirect to plans while access verification has a temporary error', () => {
    mockedUseUserAccess.mockReturnValue({
      loading: false,
      error: 'Failed to fetch',
      roles: {},
      subscription: {},
      hasFullAccess: false,
      canAccessPremiumFeatures: false,
      canManageUsers: false,
      accessLevel: 'none',
      accessMessage: 'Sem acesso',
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUserAccess>);

    renderGuardedRoute();

    expect(screen.getByText('Reconectando e confirmando seu acesso...')).toBeInTheDocument();
    expect(screen.queryByText('Pagina de planos')).not.toBeInTheDocument();
  });

  it('redirects to plans only after access is verified and denied', () => {
    mockedUseUserAccess.mockReturnValue({
      loading: false,
      error: null,
      roles: {},
      subscription: {},
      hasFullAccess: false,
      canAccessPremiumFeatures: false,
      canManageUsers: false,
      accessLevel: 'none',
      accessMessage: 'Sem acesso',
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUserAccess>);

    renderGuardedRoute();

    expect(screen.getByText('Pagina de planos')).toBeInTheDocument();
  });
});
