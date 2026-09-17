import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';

const authState = vi.hoisted(() => ({
  loading: false,
  user: null as null | { id: string; email: string },
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    loading: authState.loading,
    user: authState.user,
    signIn: authState.signIn,
    signUp: authState.signUp,
    signInWithGoogle: vi.fn(),
  }),
}));

vi.mock('@/features/billing/legal/billingLegalDocuments', () => ({
  isBillingContractAcceptanceEnabled: () => true,
  signupLegalAcceptance: {
    termsVersion: '2026-08-31.1',
    privacyVersion: '2026-08-31.1',
  },
}));

vi.mock('@/hooks/useUserLogger', () => ({
  useUserLogger: () => ({ logEvent: vi.fn() }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

vi.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => (
    <div role="status" aria-label={message ?? 'Carregando'}>{message}</div>
  ),
}));

vi.mock('@/components/ui/TracerLogo', () => ({
  TracerLogo: () => <div>vouRevisar</div>,
}));

describe('Login', () => {
  beforeEach(() => {
    authState.loading = false;
    authState.user = null;
    authState.signIn.mockReset().mockResolvedValue({ success: false });
    authState.signUp.mockReset().mockResolvedValue({ success: false });
  });

  it('does not flash the empty form while the auth session is being resolved', () => {
    authState.loading = true;

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument();
  });

  it('shows the form after auth confirms there is no active session', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Digite sua senha')).toBeInTheDocument();
  });

  it('prioritizes email login before the Google alternative', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Login />
      </MemoryRouter>,
    );

    const email = screen.getByLabelText('Email');
    const password = screen.getByLabelText('Senha');
    const submit = screen.getByRole('button', { name: 'Entrar' });
    const google = screen.getByRole('button', { name: 'Continuar com Google' });

    expect(email.compareDocumentPosition(password) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(password.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(submit.compareDocumentPosition(google) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('requires and forwards versioned legal acceptance for a new free-trial account', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Registre-se' }));
    fireEvent.change(screen.getByPlaceholderText('Seu nome completo'), { target: { value: 'Aluno Teste' } });
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'aluno@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Digite sua senha'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'senha123' } });

    const submit = screen.getByRole('button', { name: 'Criar Conta' });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() => expect(authState.signUp).toHaveBeenCalledOnce());
    expect(authState.signUp).toHaveBeenCalledWith(
      'aluno@example.com',
      'senha123',
      'Aluno Teste',
      '',
      {
        termsVersion: '2026-08-31.1',
        privacyVersion: '2026-08-31.1',
      },
    );
  });

  it('acknowledges a password login attempt while authentication is in progress', async () => {
    let resolveSignIn: (result: { success: boolean }) => void;
    authState.signIn.mockReturnValue(
      new Promise<{ success: boolean }>((resolve) => {
        resolveSignIn = resolve;
      }),
    );

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'aluno@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Digite sua senha'), { target: { value: 'senha123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('button', { name: 'Entrando…' })).toBeDisabled();

    resolveSignIn!({ success: false });
  });
});
