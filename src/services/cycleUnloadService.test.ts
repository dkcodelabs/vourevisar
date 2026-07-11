import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invokeUserRpc: vi.fn(),
  remainingOrder: vi.fn(),
  remainingEq: vi.fn(),
  remainingSelect: vi.fn(),
  supabaseFrom: vi.fn(),
  updateEq: vi.fn(),
  updateUserCycles: vi.fn(),
}));

vi.mock('@/services/userRpcService', () => ({
  invokeUserRpc: mocks.invokeUserRpc,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mocks.supabaseFrom,
  },
}));

import { buildRemainingCycleName, unloadEditalFromCycle } from './cycleUnloadService';

describe('unloadEditalFromCycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invokeUserRpc.mockResolvedValue({ ok: true, cycle_deleted: false });
    mocks.remainingOrder.mockResolvedValue({
      data: [
        { name: '2026 - PCES' },
        { name: '2026 - PMES' },
      ],
      error: null,
    });
    mocks.remainingEq.mockReturnValue({
      eq: mocks.remainingEq,
      order: mocks.remainingOrder,
    });
    mocks.remainingSelect.mockReturnValue({
      eq: mocks.remainingEq,
    });
    mocks.updateEq.mockResolvedValue({ error: null });
    mocks.updateUserCycles.mockReturnValue({
      eq: mocks.updateEq,
    });
    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'user_editais') {
        return { select: mocks.remainingSelect };
      }

      if (table === 'user_cycles') {
        return { update: mocks.updateUserCycles };
      }

      throw new Error(`Unexpected table ${table}`);
    });
  });

  it('builds a clean cycle name from the remaining active editais', () => {
    expect(buildRemainingCycleName([
      { name: ' pces ' },
      { name: 'PMES' },
      { name: 'pces' },
    ])).toBe('PCES + PMES');
  });

  it('archives the edital, dismantles merges and refreshes the remaining cycle name', async () => {
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
    expect(mocks.updateUserCycles).toHaveBeenCalledWith(expect.objectContaining({
      name: '2026 - PCES + 2026 - PMES',
      atualizado_em: expect.any(String),
    }));
  });

  it('reports when the transaction deleted the last active cycle', async () => {
    mocks.invokeUserRpc.mockResolvedValueOnce({ ok: true, cycle_deleted: true });

    await expect(unloadEditalFromCycle({
      userId: 'user-1',
      editalId: 'edital-1',
    })).resolves.toEqual({ cycleDeleted: true });
    expect(mocks.supabaseFrom).not.toHaveBeenCalledWith('user_editais');
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
