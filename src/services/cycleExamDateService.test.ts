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

import { updateActiveCycleExamDate } from './cycleExamDateService';

describe('updateActiveCycleExamDate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ update: mocks.update });
    mocks.update.mockReturnValue({ eq: mocks.eqUser });
    mocks.eqUser.mockReturnValue({ eq: mocks.eqStatus });
    mocks.eqStatus.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ single: mocks.single });
    mocks.single.mockResolvedValue({
      data: { id: 'cycle-1', exam_date: null },
      error: null,
    });
  });

  it('persists an empty date as null only in the active cycle owned by the user', async () => {
    const result = await updateActiveCycleExamDate({
      examDate: '  ',
      updatedAt: '2026-07-05T12:00:00.000Z',
      userId: 'user-1',
    });

    expect(mocks.from).toHaveBeenCalledWith('user_cycles');
    expect(mocks.update).toHaveBeenCalledWith({
      exam_date: null,
      atualizado_em: '2026-07-05T12:00:00.000Z',
    });
    expect(mocks.eqUser).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mocks.eqStatus).toHaveBeenCalledWith('status', 'active');
    expect(mocks.select).toHaveBeenCalledWith('id, exam_date');
    expect(result).toEqual({ id: 'cycle-1', exam_date: null });
  });

  it('rejects an invalid calendar date before calling Supabase', async () => {
    await expect(updateActiveCycleExamDate({
      examDate: '2026-02-31',
      userId: 'user-1',
    })).rejects.toThrow('Data da prova inválida');

    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('rejects when Supabase does not return an updated active cycle', async () => {
    mocks.single.mockResolvedValue({
      data: null,
      error: { message: 'JSON object requested, multiple (or no) rows returned' },
    });

    await expect(updateActiveCycleExamDate({
      examDate: '2026-11-20',
      userId: 'user-1',
    })).rejects.toMatchObject({
      message: 'JSON object requested, multiple (or no) rows returned',
    });
  });
});
