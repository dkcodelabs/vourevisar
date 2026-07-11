import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCycleReorderControls } from './useCycleReorderControls';

describe('useCycleReorderControls', () => {
  it('enables reorder mode and collapses expanded cycle subjects', () => {
    const setCycleExpandedSubjectIds = vi.fn();

    const { result } = renderHook(() => useCycleReorderControls({
      setCycleExpandedSubjectIds,
    }));

    expect(result.current.isReorderingCycle).toBe(false);
    expect(result.current.sensors).toBeDefined();

    act(() => {
      result.current.handleToggleCycleReorder();
    });

    expect(result.current.isReorderingCycle).toBe(true);
    expect(setCycleExpandedSubjectIds).toHaveBeenCalledWith([]);

    act(() => {
      result.current.handleToggleCycleReorder();
    });

    expect(result.current.isReorderingCycle).toBe(false);
    expect(setCycleExpandedSubjectIds).toHaveBeenCalledTimes(1);
  });
});
