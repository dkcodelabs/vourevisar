import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserCycle } from '@/types';

const mocks = vi.hoisted(() => ({
  reportError: vi.fn(),
  resetStudyCycle: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('@/services/studyCycleResetService', () => ({
  resetStudyCycle: mocks.resetStudyCycle,
}));

vi.mock('@/lib/errors/errorService', () => ({
  errorService: { report: mocks.reportError },
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: mocks.toastSuccess },
}));

import { useStudyCycleReset } from './useStudyCycleReset';

const userCycle: UserCycle = {
  atualizado_em: '2026-07-02T12:00:00.000Z',
  ciclo_atual: ['subject-1'],
  ciclos_realizados: 3,
  created_at: '2026-07-01T12:00:00.000Z',
  data_fim_ciclo: null,
  data_inicio_ciclo: '2026-07-01T12:00:00.000Z',
  disciplinas_do_dia: [],
  id: 'cycle-1',
  materias_estudadas_ciclo: ['subject-1'],
  materias_pendentes: [],
  status: 'active',
  user_id: 'user-1',
};

describe('useStudyCycleReset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('rolls back optimistic cycle state and cache when persistence fails', async () => {
    const setUserCycle = vi.fn();
    mocks.resetStudyCycle.mockRejectedValue(new Error('database unavailable'));

    const { result } = renderHook(() => useStudyCycleReset({
      setUserCycle,
      userCycle,
      userId: 'user-1',
    }));

    await act(async () => {
      result.current.setResetCycleConfirmOpen(true);
    });
    await act(async () => {
      await result.current.resetCycle();
    });

    expect(setUserCycle).toHaveBeenLastCalledWith(userCycle);
    expect(JSON.parse(localStorage.getItem('user_cycle_cache_user-1') || 'null')).toEqual(userCycle);
    expect(result.current.resetCycleConfirmOpen).toBe(true);
    expect(result.current.isResettingCycle).toBe(false);
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.reportError).toHaveBeenCalledOnce();
  });

  it('closes confirmation and announces the cycle update after persistence succeeds', async () => {
    const setUserCycle = vi.fn();
    const cycleUpdated = vi.fn();
    mocks.resetStudyCycle.mockResolvedValue(undefined);
    window.addEventListener('cycleUpdated', cycleUpdated);

    const { result } = renderHook(() => useStudyCycleReset({
      setUserCycle,
      userCycle,
      userId: 'user-1',
    }));

    await act(async () => {
      result.current.setResetCycleConfirmOpen(true);
    });
    await act(async () => {
      await result.current.resetCycle();
    });

    expect(result.current.resetCycleConfirmOpen).toBe(false);
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Ciclo reiniciado.');
    expect(cycleUpdated).toHaveBeenCalledOnce();
    expect(mocks.reportError).not.toHaveBeenCalled();

    window.removeEventListener('cycleUpdated', cycleUpdated);
  });

  it('starts the next cycle without resetting historical cycle count', async () => {
    const setUserCycle = vi.fn();
    const cycleUpdated = vi.fn();
    mocks.resetStudyCycle.mockResolvedValue(undefined);
    window.addEventListener('cycleUpdated', cycleUpdated);

    const { result } = renderHook(() => useStudyCycleReset({
      setUserCycle,
      userCycle,
      userId: 'user-1',
    }));

    await act(async () => {
      await result.current.startNextCycle();
    });

    expect(mocks.resetStudyCycle).toHaveBeenCalledWith({
      fields: expect.objectContaining({
        ciclos_realizados: 4,
        data_fim_ciclo: null,
        materias_estudadas_ciclo: [],
      }),
      userId: 'user-1',
    });
    expect(setUserCycle).toHaveBeenCalledWith(expect.objectContaining({
      ciclos_realizados: 4,
      materias_estudadas_ciclo: [],
    }));
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Ciclo 5 iniciado.');
    expect(cycleUpdated).toHaveBeenCalledOnce();

    window.removeEventListener('cycleUpdated', cycleUpdated);
  });
});
