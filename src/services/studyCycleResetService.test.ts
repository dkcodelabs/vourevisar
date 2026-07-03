import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  eqStatus: vi.fn(),
  eqUser: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mocks.from },
}));

import { resetStudyCycle } from './studyCycleResetService';

describe('resetStudyCycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ update: mocks.update });
    mocks.update.mockReturnValue({ eq: mocks.eqUser });
    mocks.eqUser.mockReturnValue({ eq: mocks.eqStatus });
    mocks.eqStatus.mockResolvedValue({ error: null });
  });

  it('persists reset fields only in the active cycle owned by the user', async () => {
    const fields = {
      atualizado_em: '2026-07-03T12:00:01.000Z',
      ciclos_realizados: 0,
      data_fim_ciclo: null,
      data_inicio_ciclo: '2026-07-03T12:00:00.000Z',
      materias_estudadas_ciclo: [],
    };

    await resetStudyCycle({ fields, userId: 'user-1' });

    expect(mocks.from).toHaveBeenCalledWith('user_cycles');
    expect(mocks.update).toHaveBeenCalledWith(fields);
    expect(mocks.eqUser).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mocks.eqStatus).toHaveBeenCalledWith('status', 'active');
  });
});
