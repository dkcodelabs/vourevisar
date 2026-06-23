import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mocks.from, rpc: mocks.rpc },
}));

import { unloadEditalFromCycle } from './cycleUnloadService';

describe('unloadEditalFromCycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({
      data: { ok: true, cycle_deleted: false },
      error: null,
    });
  });

  it('archives the edital and dismantles merges through one atomic RPC', async () => {
    const result = await unloadEditalFromCycle({
      userId: 'user-1',
      editalId: 'edital-1',
    });

    expect(result).toEqual({ cycleDeleted: false });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith('atomic_archive_edital_from_cycle', {
      p_user_id: 'user-1',
      p_edital_id: 'edital-1',
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('reports when the transaction deleted the last active cycle', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: { ok: true, cycle_deleted: true },
      error: null,
    });

    await expect(unloadEditalFromCycle({
      userId: 'user-1',
      editalId: 'edital-1',
    })).resolves.toEqual({ cycleDeleted: true });
  });

  it('propagates database errors without attempting a fallback write', async () => {
    const databaseError = new Error('transaction failed');
    mocks.rpc.mockResolvedValueOnce({ data: null, error: databaseError });

    await expect(unloadEditalFromCycle({
      userId: 'user-1',
      editalId: 'edital-1',
    })).rejects.toThrow('transaction failed');

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('rejects an explicit unsuccessful transaction result', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: { ok: false, error: 'archive rejected' },
      error: null,
    });

    await expect(unloadEditalFromCycle({
      userId: 'user-1',
      editalId: 'edital-1',
    })).rejects.toThrow('archive rejected');
  });
});
