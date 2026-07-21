import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  getUser: vi.fn(),
  resend: vi.fn(),
}));
const functions = vi.hoisted(() => ({
  invoke: vi.fn().mockResolvedValue({ data: { status: 'pending' }, error: null }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth, functions },
}));

vi.mock('@/lib/errors/toastGate', () => ({
  toastGate: { notifyError: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn() },
}));

vi.mock('@/utils/authRedirect', () => ({
  getAuthCallbackUrl: () => 'https://www.vourevisar.com.br/auth/callback',
}));

vi.mock('@/components/layout/PageContainer', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui', () => ({
  GlassCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  GradientButton: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <div>Carregando</div>,
}));

import ConfirmEmail from './ConfirmEmail';

const renderConfirmEmail = (entry = '/confirm-email?email=aluno@example.com') => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/confirm-email" element={<ConfirmEmail />} />
      <Route path="/login" element={<div>Tela de login</div>} />
    </Routes>
  </MemoryRouter>,
);

describe('ConfirmEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'Auth session missing' } });
    auth.resend.mockResolvedValue({ error: null });
  });

  it('redireciona uma aba antiga quando outra aba confirma o mesmo email', async () => {
    renderConfirmEmail();

    window.dispatchEvent(new StorageEvent('storage', {
      key: 'confirmedEmail',
      newValue: 'aluno@example.com',
    }));

    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
    expect(auth.resend).not.toHaveBeenCalled();
  });

  it('não tenta reenviar quando a sessão local já informa email confirmado', async () => {
    auth.getUser.mockResolvedValue({
      data: {
        user: {
          email: 'aluno@example.com',
          email_confirmed_at: '2026-07-20T12:00:00Z',
          app_metadata: { provider: 'email', providers: ['email'] },
        },
      },
      error: null,
    });

    renderConfirmEmail();
    fireEvent.click(await screen.findByRole('button', { name: /reenviar email de confirmação/i }));

    expect(await screen.findByText(/este email já foi confirmado/i)).toBeInTheDocument();
    expect(auth.resend).not.toHaveBeenCalled();
  });

  it('solicita reenvio quando não há sessão confirmada localmente', async () => {
    renderConfirmEmail();
    fireEvent.click(await screen.findByRole('button', { name: /reenviar email de confirmação/i }));

    await waitFor(() => expect(auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'aluno@example.com',
      options: { emailRedirectTo: 'https://www.vourevisar.com.br/auth/callback' },
    }));
    expect(await screen.findByText(/solicitação aceita/i)).toBeInTheDocument();
  });
});
