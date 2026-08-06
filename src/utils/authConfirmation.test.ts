import { describe, expect, it } from 'vitest';
import {
  isEmailConfirmationPending,
  isEmailPasswordUser,
  isExpectedPasswordSignInError,
} from './authConfirmation';

describe('authConfirmation', () => {
  it('bloqueia usuário de email e senha sem confirmação', () => {
    expect(isEmailConfirmationPending({
      email: 'aluno@example.com',
      app_metadata: { provider: 'email', providers: ['email'] },
    })).toBe(true);
  });

  it('libera usuário de email e senha confirmado', () => {
    expect(isEmailConfirmationPending({
      email: 'aluno@example.com',
      email_confirmed_at: '2026-05-28T12:00:00Z',
      app_metadata: { provider: 'email', providers: ['email'] },
    })).toBe(false);
  });

  it('não exige confirmação local para OAuth', () => {
    expect(isEmailConfirmationPending({
      email: 'aluno@example.com',
      app_metadata: { provider: 'google', providers: ['google'] },
    })).toBe(false);
  });

  it('trata usuário com email e provedor ausente como fluxo de senha', () => {
    expect(isEmailPasswordUser({
      email: 'aluno@example.com',
      app_metadata: {},
    })).toBe(true);
  });

  it('classifica credenciais inválidas como rejeição esperada do login', () => {
    expect(isExpectedPasswordSignInError(new Error('Invalid login credentials'))).toBe(true);
    expect(isExpectedPasswordSignInError(new Error('Failed to fetch'))).toBe(false);
  });
});
