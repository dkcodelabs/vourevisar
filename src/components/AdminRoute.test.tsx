import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useUserRole: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: mocks.useUserRole }));
vi.mock('@/contexts/StudentHubContext', () => ({
  StudentHubProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/AppLayout', () => ({ AppLayout: Outlet }));

import { AdminRoute } from './AdminRoute';

const renderRoute = () => render(
  <MemoryRouter initialEntries={['/admin/editais']}>
    <Routes>
      <Route element={<AdminRoute />}>
        <Route path="admin/editais" element={<div>Conteúdo administrativo</div>} />
      </Route>
      <Route path="login" element={<div>Login</div>} />
      <Route path="dashboard" element={<div>Painel</div>} />
    </Routes>
  </MemoryRouter>,
);

describe('AdminRoute', () => {
  beforeEach(() => {
    mocks.useAuth.mockReturnValue({
      authInitialized: true,
      user: { id: 'user-1', email_confirmed_at: '2026-01-01T00:00:00.000Z' },
    });
    mocks.useUserRole.mockReturnValue({
      loading: false,
      error: null,
      isAdmin: true,
      refetch: vi.fn(),
    });
  });

  it('keeps one blocking loading surface until both session and role are resolved', () => {
    mocks.useAuth.mockReturnValue({ authInitialized: false, user: null });

    renderRoute();

    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo administrativo')).not.toBeInTheDocument();
  });

  it('does not mount the administrative shell while role access is loading', () => {
    mocks.useUserRole.mockReturnValue({ loading: true, error: null, isAdmin: false, refetch: vi.fn() });

    renderRoute();

    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo administrativo')).not.toBeInTheDocument();
  });

  it('mounts the administrative page only after access succeeds', () => {
    renderRoute();

    expect(screen.getByText('Conteúdo administrativo')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
