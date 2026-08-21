import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getSession: vi.fn(),
  setSession: vi.fn(),
  signOut: vi.fn(),
}));

const legalAcceptance = vi.hoisted(() => ({
  complete: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth },
}));

vi.mock('@/lib/errors/toastGate', () => ({
  toastGate: { notifyError: vi.fn() },
}));

vi.mock('@/features/billing/legal/signupLegalAcceptanceService', () => ({
  completePendingSignupLegalAcceptance: legalAcceptance.complete,
}));

vi.mock('./ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <div>Autenticando...</div>,
}));

import { AuthCallback } from './AuthCallback';

const renderAuthCallback = (entry = '/auth/callback') => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/confirm-email" element={<div>Tela de confirmação</div>} />
      <Route path="/login" element={<div>Tela de login</div>} />
      <Route path="/dashboard" element={<div>Dashboard</div>} />
    </Routes>
  </MemoryRouter>,
);

describe('AuthCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.pushState({}, '', '/auth/callback');
    auth.exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
    auth.getSession.mockResolvedValue({ data: { session: null } });
    auth.setSession.mockResolvedValue({ data: { session: null }, error: null });
    auth.signOut.mockResolvedValue({ error: null });
    legalAcceptance.complete.mockReset().mockResolvedValue(false);
  });

  it('não reaproveita sessão local quando callback vazio tem confirmação pendente', async () => {
    localStorage.setItem('pendingConfirmationEmail', 'aluno@example.com');
    auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            email: 'aluno@example.com',
            email_confirmed_at: '2026-07-20T12:00:00Z',
            confirmed_at: '2026-07-20T12:00:00Z',
            app_metadata: { provider: 'email', providers: ['email'] },
          },
        },
      },
    });

    renderAuthCallback();

    expect(await screen.findByText('Tela de confirmação')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(auth.signOut).toHaveBeenCalled();
    expect(auth.getSession).not.toHaveBeenCalled();
  });

  it('limpa marcadores pendentes depois de confirmação de cadastro bem-sucedida', async () => {
    window.history.pushState({}, '', '/auth/callback?code=valid-code&type=signup');
    localStorage.setItem('pendingConfirmationEmail', 'aluno@example.com');
    localStorage.setItem('pendingConfirmationCooldownUntil', String(Date.now() + 60_000));
    auth.exchangeCodeForSession.mockResolvedValue({
      data: {
        user: {
          email: 'aluno@example.com',
          email_confirmed_at: '2026-07-20T12:00:00Z',
          confirmed_at: '2026-07-20T12:00:00Z',
          app_metadata: { provider: 'email', providers: ['email'] },
        },
      },
      error: null,
    });

    renderAuthCallback('/auth/callback?code=valid-code&type=signup');

    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
    await waitFor(() => {
      expect(localStorage.getItem('pendingConfirmationEmail')).toBeNull();
      expect(localStorage.getItem('pendingConfirmationCooldownUntil')).toBeNull();
    });
    expect(localStorage.getItem('confirmedEmail')).toBe('aluno@example.com');
  });

  it('conclui o aceite pendente antes de liberar o retorno do Google', async () => {
    window.history.pushState({}, '', '/auth/callback?code=google-code');
    auth.exchangeCodeForSession.mockResolvedValue({
      data: {
        user: {
          email: 'aluno@gmail.com',
          email_confirmed_at: '2026-08-21T00:00:00Z',
          confirmed_at: '2026-08-21T00:00:00Z',
          app_metadata: { provider: 'google', providers: ['google'] },
        },
      },
      error: null,
    });

    renderAuthCallback('/auth/callback?code=google-code');

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(legalAcceptance.complete).toHaveBeenCalledOnce();
  });
});
