import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkAIStatusDirect } from './useAIStatus';

const { fromMock, invokeMock, notifyErrorMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  invokeMock: vi.fn(),
  notifyErrorMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
    from: fromMock,
  },
}));

vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/errors/toastGate', () => ({
  toastGate: {
    notifyError: notifyErrorMock,
  },
}));

beforeEach(() => {
  fromMock.mockReset();
  invokeMock.mockReset();
  notifyErrorMock.mockReset();
});

describe('checkAIStatusDirect', () => {
  it('does not try to persist AI status remotely when the Edge Function is unreachable', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: new Error('Failed to send a request to the Edge Function'),
    });

    const status = await checkAIStatusDirect(false);

    expect(status.status).toBe('error');
    expect(status.errorMessage).toBe('Não consegui conectar ao servidor agora. Confira sua internet e tente novamente.');
    expect(fromMock).not.toHaveBeenCalled();
    expect(notifyErrorMock).toHaveBeenCalledWith(
      'Não consegui conectar ao servidor agora. Confira sua internet e tente novamente.',
      'CONNECTION_ERROR',
      { severity: 'medium', flowKey: 'ai-status-check' },
    );
  });
});
