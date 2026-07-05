import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserCycle } from '@/types';

const mocks = vi.hoisted(() => ({
  reportError: vi.fn(),
  toastSuccess: vi.fn(),
  updateExamDate: vi.fn(),
}));

vi.mock('@/services/cycleExamDateService', () => ({
  updateActiveCycleExamDate: mocks.updateExamDate,
}));

vi.mock('@/lib/errors/errorService', () => ({
  errorService: { report: mocks.reportError },
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: mocks.toastSuccess },
}));

import { useCycleExamDateEditor } from './useCycleExamDateEditor';

const userCycle: UserCycle = {
  atualizado_em: '2026-07-02T12:00:00.000Z',
  ciclo_atual: ['subject-1'],
  ciclos_realizados: 3,
  created_at: '2026-07-01T12:00:00.000Z',
  data_fim_ciclo: null,
  data_inicio_ciclo: '2026-07-01T12:00:00.000Z',
  disciplinas_do_dia: [],
  exam_date: '2026-07-01',
  id: 'cycle-1',
  materias_estudadas_ciclo: [],
  materias_pendentes: ['subject-1'],
  status: 'active',
  user_id: 'user-1',
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe('useCycleExamDateEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('updates local cycle state, cache and consumers after persistence succeeds', async () => {
    const setUserCycle = vi.fn();
    const cycleUpdated = vi.fn();
    mocks.updateExamDate.mockResolvedValue({ id: 'cycle-1', exam_date: '2026-11-20' });
    window.addEventListener('cycleUpdated', cycleUpdated);

    const { result } = renderHook(() => useCycleExamDateEditor({
      setUserCycle,
      userCycle,
      userId: 'user-1',
    }), { wrapper: createWrapper() });

    act(() => result.current.openEditor());
    expect(result.current.examDateDraft).toBe('2026-07-01');

    act(() => result.current.setExamDateDraft('2026-11-20'));
    await act(async () => {
      expect(await result.current.saveExamDate()).toBe(true);
    });

    const nextCycle = expect.objectContaining({ exam_date: '2026-11-20' });
    expect(mocks.updateExamDate).toHaveBeenCalledWith({ examDate: '2026-11-20', userId: 'user-1' });
    expect(setUserCycle).toHaveBeenCalledWith(nextCycle);
    expect(JSON.parse(localStorage.getItem('user_cycle_cache_user-1') || 'null')).toEqual(nextCycle);
    expect(result.current.editorOpen).toBe(false);
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Data da prova atualizada.');
    expect(cycleUpdated).toHaveBeenCalledOnce();

    window.removeEventListener('cycleUpdated', cycleUpdated);
  });

  it('keeps the editor open and exposes an error when persistence fails', async () => {
    const setUserCycle = vi.fn();
    mocks.updateExamDate.mockRejectedValue(new Error('database unavailable'));

    const { result } = renderHook(() => useCycleExamDateEditor({
      setUserCycle,
      userCycle,
      userId: 'user-1',
    }), { wrapper: createWrapper() });

    act(() => result.current.openEditor());
    await act(async () => {
      expect(await result.current.saveExamDate()).toBe(false);
    });

    expect(result.current.editorOpen).toBe(true);
    expect(result.current.errorMessage).toBe('Não foi possível atualizar a data da prova. Tente novamente.');
    expect(setUserCycle).not.toHaveBeenCalled();
    expect(mocks.reportError).toHaveBeenCalledOnce();
  });
});
