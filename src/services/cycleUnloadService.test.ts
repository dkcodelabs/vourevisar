import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invokeUserRpc: vi.fn(),
}));

vi.mock('@/services/userRpcService', () => ({
  invokeUserRpc: mocks.invokeUserRpc,
}));

import { unloadEditalFromCycle } from './cycleUnloadService';

describe('unloadEditalFromCycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invokeUserRpc.mockResolvedValue({ ok: true, cycle_deleted: false });
  });

  it('archives the edital and dismantles merges through one atomic RPC', async () => {
    const result = await unloadEditalFromCycle({
      userId: 'user-1',
      editalId: 'edital-1',
    });

    expect(result).toEqual({ cycleDeleted: false });
    expect(mocks.invokeUserRpc).toHaveBeenCalledTimes(1);
    expect(mocks.invokeUserRpc).toHaveBeenCalledWith('atomic_archive_edital_from_cycle', {
      p_user_id: 'user-1',
      p_edital_id: 'edital-1',
    });
  });

  it('reports when the transaction deleted the last active cycle', async () => {
    mocks.invokeUserRpc.mockResolvedValueOnce({ ok: true, cycle_deleted: true });

    await expect(unloadEditalFromCycle({
      userId: 'user-1',
      editalId: 'edital-1',
    })).resolves.toEqual({ cycleDeleted: true });
  });

  it('propagates database errors without attempting a fallback write', async () => {
    const databaseError = new Error('transaction failed');
    mocks.invokeUserRpc.mockRejectedValueOnce(databaseError);

    await expect(unloadEditalFromCycle({
      userId: 'user-1',
      editalId: 'edital-1',
    })).rejects.toThrow('transaction failed');

    expect(mocks.invokeUserRpc).toHaveBeenCalledTimes(1);
  });

  it('rejects an explicit unsuccessful transaction result', async () => {
    mocks.invokeUserRpc.mockResolvedValueOnce({ ok: false, error: 'archive rejected' });

    await expect(unloadEditalFromCycle({
      userId: 'user-1',
      editalId: 'edital-1',
    })).rejects.toThrow('archive rejected');
  });
});
