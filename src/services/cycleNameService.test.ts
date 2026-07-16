import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  eqStatus: vi.fn(),
  eqUser: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mocks.from },
}));

import { updateActiveCycleName } from './cycleNameService';

describe('updateActiveCycleName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ update: mocks.update });
    mocks.update.mockReturnValue({ eq: mocks.eqUser });
    mocks.eqUser.mockReturnValue({ eq: mocks.eqStatus });
    mocks.eqStatus.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ single: mocks.single });
    mocks.single.mockResolvedValue({
      data: { id: 'cycle-1', name: 'Ciclo Polícia Civil' },
      error: null,
    });
  });

  it('normalizes and persists the active cycle name owned by the user', async () => {
    const result = await updateActiveCycleName({
      name: '  Ciclo   Polícia   Civil  ',
      updatedAt: '2026-07-15T12:00:00.000Z',
      userId: 'user-1',
    });

    expect(mocks.from).toHaveBeenCalledWith('user_cycles');
    expect(mocks.update).toHaveBeenCalledWith({
      name: 'Ciclo Polícia Civil',
      atualizado_em: '2026-07-15T12:00:00.000Z',
    });
    expect(mocks.eqUser).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mocks.eqStatus).toHaveBeenCalledWith('status', 'active');
    expect(mocks.select).toHaveBeenCalledWith('id, name');
    expect(result).toEqual({ id: 'cycle-1', name: 'Ciclo Polícia Civil' });
  });

  it('rejects blank names before calling Supabase', async () => {
    await expect(updateActiveCycleName({
      name: '   ',
      userId: 'user-1',
    })).rejects.toThrow('Nome do ciclo obrigatório');

    expect(mocks.from).not.toHaveBeenCalled();
  });
});
