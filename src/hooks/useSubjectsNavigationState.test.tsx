import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSubjectsNavigationState } from './useSubjectsNavigationState';

describe('useSubjectsNavigationState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('opens the import modal from navigation state and clears browser history state', () => {
    const replaceState = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});

    const { result } = renderHook(() => useSubjectsNavigationState({
      locationState: {
        importTab: 'ia',
        openImportModal: true,
      },
    }));

    expect(result.current.isImportEditalModalOpen).toBe(true);
    expect(result.current.modalInitialTab).toBe('ia');
    expect(replaceState).toHaveBeenCalledWith({}, document.title);
  });

  it('focuses the cycle search input after opening search', () => {
    const focus = vi.fn();
    const input = document.createElement('input');
    input.focus = focus;

    const { result } = renderHook(() => useSubjectsNavigationState({
      locationState: null,
    }));

    act(() => {
      result.current.inputRef.current = input;
      result.current.openCycleSearch();
    });

    expect(focus).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('allows closing the import modal without touching the selected initial tab', () => {
    const locationState = {
      importTab: 'manual' as const,
      openImportModal: true,
    };

    const { result } = renderHook(() => useSubjectsNavigationState({
      locationState,
    }));

    act(() => {
      result.current.closeImportEditalModal();
    });

    expect(result.current.isImportEditalModalOpen).toBe(false);
    expect(result.current.modalInitialTab).toBe('manual');
  });
});
