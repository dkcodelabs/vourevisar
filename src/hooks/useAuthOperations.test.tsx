import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { useAuthOperations } from './useAuthOperations';
import { supabase } from '@/integrations/supabase/client';
import { toastManager } from '@/utils/toastManager';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@/utils/toastManager', () => ({
  toastManager: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useAuthOperations - signUp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects existing user when Supabase returns empty identities array', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          app_metadata: { provider: 'email' },
          user_metadata: {},
          aud: 'authenticated',
          created_at: '2026-01-01',
          identities: [], // Empty identities array indicates user already exists in Supabase
        } as unknown as User,
        session: null,
      },
      error: null,
    });

    const { result } = renderHook(() => useAuthOperations());

    await expect(
      act(async () => {
        await result.current.signUp('existente@vourevisar.com.br', 'senha123', 'Aluno');
      }),
    ).rejects.toThrow('Este email já está cadastrado. Faça login para acessar sua conta.');

    expect(toastManager.error).toHaveBeenCalledWith(
      'Este email já está cadastrado. Faça login para acessar sua conta.',
    );
  });

  it('succeeds and notifies user when a new account is registered with identity', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: {
        user: {
          id: 'user-novo',
          email: 'novo@vourevisar.com.br',
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: {},
          aud: 'authenticated',
          created_at: '2026-01-01',
          email_confirmed_at: null,
          confirmed_at: null,
          identities: [{ provider: 'email', id: 'ident-1', user_id: 'user-novo', identity_data: {}, last_sign_in_at: '2026-01-01', created_at: '2026-01-01', updated_at: '2026-01-01' }],
        } as unknown as User,
        session: null,
      },
      error: null,
    });

    const { result } = renderHook(() => useAuthOperations());

    let res: Awaited<ReturnType<typeof result.current.signUp>> | undefined;
    await act(async () => {
      res = await result.current.signUp('novo@vourevisar.com.br', 'senha123', 'Novo Aluno');
    });

    expect(res?.user?.id).toBe('user-novo');
    expect(toastManager.success).toHaveBeenCalledWith(
      'Cadastro realizado! Enviamos um link de confirmação para o seu email.',
    );
  });
});
