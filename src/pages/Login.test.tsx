import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';

const authState = vi.hoisted(() => ({
  loading: false,
  user: null as null | { id: string; email: string },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    loading: authState.loading,
    user: authState.user,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signInWithGoogle: vi.fn(),
  }),
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
  LoadingSpinner: ({ message }: { message?: string }) => <div>{message}</div>,
}));

vi.mock('@/components/ui/TracerLogo', () => ({
  TracerLogo: () => <div>vouRevisar</div>,
}));

describe('Login', () => {
  beforeEach(() => {
    authState.loading = false;
    authState.user = null;
  });

  it('does not flash the empty form while the auth session is being resolved', () => {
    authState.loading = true;

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText('Entrando...')).toBeInTheDocument();
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
});
