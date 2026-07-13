import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invokeUserRpc: vi.fn(),
}));

vi.mock('@/services/userRpcService', () => ({
  invokeUserRpc: mocks.invokeUserRpc,
}));

import { resetEditalStudyProgress } from './editalStudyProgressResetService';

describe('resetEditalStudyProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invokeUserRpc.mockResolvedValue({
      ok: true,
      reset_topics: 3,
      deleted_history: 7,
      deleted_sessions: 2,
    });
  });

  it('delegates destructive edital progress reset to the user RPC boundary', async () => {
    const result = await resetEditalStudyProgress({
      editalId: 'edital-1',
      userId: 'user-1',
    });

    expect(mocks.invokeUserRpc).toHaveBeenCalledWith('reset_edital_study_progress', {
      p_user_id: 'user-1',
      p_edital_id: 'edital-1',
    });
    expect(result).toEqual({
      resetTopics: 3,
      deletedHistory: 7,
      deletedSessions: 2,
    });
  });

  it('throws when the RPC reports failure', async () => {
    mocks.invokeUserRpc.mockResolvedValue({ ok: false });

    await expect(resetEditalStudyProgress({
      editalId: 'edital-1',
      userId: 'user-1',
    })).rejects.toThrow('Falha ao reiniciar progresso do edital.');
  });
});
