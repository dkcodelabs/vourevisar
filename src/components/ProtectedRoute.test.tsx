import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextType } from '@/contexts/auth-context';
import { ProtectedRoute } from './ProtectedRoute';

const authenticatedUser = {
  id: '39ac3a99-3a8c-4902-a4e5-18b856f66442',
  email: 'aluno@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-08-22T12:00:00.000Z',
  email_confirmed_at: '2026-08-22T12:00:00.000Z',
} as User;

const makeAuthValue = (overrides: Partial<AuthContextType>): AuthContextType => ({
  user: null,
  profile: null,
  loading: false,
  authInitialized: true,
  signUp: vi.fn(),
  signIn: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  updatePassword: vi.fn(),
  resetPassword: vi.fn(),
  ...overrides,
});

const renderProtectedRoute = (auth: AuthContextType) => render(
  <AuthContext.Provider value={auth}>
    <MemoryRouter initialEntries={['/checkout?plan=monthly&from=subscription']}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/checkout" element={<div>Checkout protegido</div>} />
        </Route>
        <Route path="/login" element={<div>Tela de login</div>} />
      </Routes>
    </MemoryRouter>
  </AuthContext.Provider>,
);

describe('ProtectedRoute', () => {
  it('waits for the first Supabase session resolution instead of flashing Login', () => {
    renderProtectedRoute(makeAuthValue({ authInitialized: false }));

    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument();
    expect(screen.queryByText('Tela de login')).not.toBeInTheDocument();
  });

  it('redirects to Login only after an unauthenticated session is resolved', () => {
    renderProtectedRoute(makeAuthValue({ authInitialized: true, user: null }));

    expect(screen.getByText('Tela de login')).toBeInTheDocument();
  });

  it('keeps an authenticated checkout route in place', () => {
    renderProtectedRoute(makeAuthValue({ user: authenticatedUser }));

    expect(screen.getByText('Checkout protegido')).toBeInTheDocument();
  });
});
