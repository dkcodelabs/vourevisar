import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  reportError,
  toastSuccess,
  unloadEditalFromCycle,
} = vi.hoisted(() => ({
  reportError: vi.fn(),
  toastSuccess: vi.fn(),
  unloadEditalFromCycle: vi.fn(),
}));

vi.mock('@/services/cycleUnloadService', () => ({
  unloadEditalFromCycle,
}));

vi.mock('@/lib/errors/errorService', () => ({
  errorService: { report: reportError },
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: toastSuccess },
}));

import { useCycleEditalUnload } from './useCycleEditalUnload';

describe('useCycleEditalUnload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('removes an edital, invalidates cycle state and refreshes the page data', async () => {
    const refreshData = vi.fn().mockResolvedValue(undefined);
    const dispatchedEvents: string[] = [];
    const eventListener = (event: Event) => dispatchedEvents.push(event.type);
    window.addEventListener('subjectUpdated', eventListener);
    window.addEventListener('cycleUpdated', eventListener);
    unloadEditalFromCycle.mockResolvedValue({ cycleDeleted: false });
    localStorage.setItem('user_cycle_cache_user-1', 'cached');

    const { result } = renderHook(() => useCycleEditalUnload({
      refreshData,
      userId: 'user-1',
    }));

    let removed = false;
    await act(async () => {
      removed = await result.current.unloadEdital('edital-1', 'Receita Federal');
    });

    expect(removed).toBe(true);
    expect(unloadEditalFromCycle).toHaveBeenCalledWith({
      userId: 'user-1',
      editalId: 'edital-1',
    });
    expect(localStorage.getItem('user_cycle_cache_user-1')).toBeNull();
    expect(dispatchedEvents).toEqual(['subjectUpdated', 'cycleUpdated']);
    expect(refreshData).toHaveBeenCalledOnce();
    expect(toastSuccess).toHaveBeenCalledWith('"Receita Federal" removido do ciclo.');
    expect(result.current.unloadingEditalId).toBeNull();

    window.removeEventListener('subjectUpdated', eventListener);
    window.removeEventListener('cycleUpdated', eventListener);
  });
});
