import { describe, expect, it } from 'vitest';

import {
  getConnectionErrorCode,
  getConnectionErrorMessage,
  isConnectionError,
} from './networkError';

describe('network error helpers', () => {
  it('detects fetch, Supabase Edge Function and browser certificate failures', () => {
    expect(isConnectionError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isConnectionError(new Error('Failed to send a request to the Edge Function'))).toBe(true);
    expect(isConnectionError({ name: 'FunctionsFetchError', message: 'Load failed' })).toBe(true);
    expect(isConnectionError(new Error('net::ERR_CERT_AUTHORITY_INVALID'))).toBe(true);
  });

  it('returns specific user copy for invalid certificate failures', () => {
    const error = new Error('net::ERR_CERT_AUTHORITY_INVALID');

    expect(getConnectionErrorCode(error)).toBe('SECURE_CONNECTION_ERROR');
    expect(getConnectionErrorMessage(error)).toBe(
      'Não consegui validar a conexão segura com o servidor. Desative VPN/proxy/antivírus com inspeção HTTPS ou tente outra rede.',
    );
  });

  it('does not classify business validation errors as connection errors', () => {
    expect(isConnectionError(new Error('Cupom inválido'))).toBe(false);
    expect(getConnectionErrorCode(new Error('Cupom inválido'))).toBeNull();
  });
});
