import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mocks.from },
}));

vi.mock('./mergeService', () => ({
  mergeService: {
    repairIntegrity: vi.fn(),
  },
}));

import { deleteOrphanedCycles } from './dataIntegrityService';

const query = (result: unknown) => {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    then: vi.fn((resolve, reject) => Promise.resolve(result).then(resolve, reject)),
  };
  return builder;
};

describe('deleteOrphanedCycles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps an inactive cycle that still has manual studied subjects for edital reload recovery', async () => {
    const preservedCycle = {
      id: 'cycle-1',
      ciclo_atual: [],
      materias_estudadas_ciclo: ['subject-1'],
    };
    const cyclesQuery = query({ data: [preservedCycle], error: null });
    const countQuery = query({ count: 0, error: null });

    mocks.from
      .mockReturnValueOnce(cyclesQuery)
      .mockReturnValueOnce(countQuery);

    const result = await deleteOrphanedCycles('user-1');

    expect(result).toEqual({ success: true, deleted: 0, preserved: 1 });
    expect(mocks.from).toHaveBeenCalledTimes(2);
  });
});
