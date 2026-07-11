import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCycleUnloadConfirmation } from './useCycleUnloadConfirmation';

describe('useCycleUnloadConfirmation', () => {
  it('unloads the edital and closes the confirmation when removal succeeds', async () => {
    const handleUnloadCycle = vi.fn().mockResolvedValue(true);
    const setUnloadConfirm = vi.fn();

    const { result } = renderHook(() => useCycleUnloadConfirmation({
      handleUnloadCycle,
      setUnloadConfirm,
      unloadConfirm: {
        editalId: 'edital-1',
        editalName: 'Receita Federal',
        isOpen: true,
      },
    }));

    await act(async () => {
      await result.current.handleUnloadConfirm();
    });

    expect(handleUnloadCycle).toHaveBeenCalledWith('edital-1', 'Receita Federal');
    expect(setUnloadConfirm).toHaveBeenCalledWith(expect.any(Function));
    expect(setUnloadConfirm.mock.calls[0][0]({ editalId: 'edital-1', isOpen: true })).toEqual({
      editalId: 'edital-1',
      isOpen: false,
    });
  });

  it('does not call unload without an edital id and closes on open-change false', async () => {
    const handleUnloadCycle = vi.fn();
    const setUnloadConfirm = vi.fn();

    const { result } = renderHook(() => useCycleUnloadConfirmation({
      handleUnloadCycle,
      setUnloadConfirm,
      unloadConfirm: {
        editalId: null,
        isOpen: true,
      },
    }));

    await act(async () => {
      await result.current.handleUnloadConfirm();
      result.current.handleUnloadConfirmOpenChange(false);
    });

    expect(handleUnloadCycle).not.toHaveBeenCalled();
    expect(setUnloadConfirm).toHaveBeenCalledWith(expect.any(Function));
  });
});
