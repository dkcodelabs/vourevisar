import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStrategicDockVisibility } from './useStrategicDockVisibility';

const assignRect = (element: Element, rect: Partial<DOMRect>) => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
      ...rect,
    }),
  });
};

describe('useStrategicDockVisibility', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calculates the mobile dock layout from the strategic panel title', async () => {
    const title = document.createElement('a');
    const dock = document.createElement('a');
    assignRect(title, { left: 24, right: 224, top: 180 });
    assignRect(dock, { top: 120 });

    const { result, rerender } = renderHook((strategicAlertsLength: number) => useStrategicDockVisibility({
      activeTab: 'all',
      isLoading: false,
      isOriginsLoading: false,
      loading: false,
      queueSuggestion: null,
      showCycleWorkspace: true,
      strategicAlertsLength,
    }), {
      initialProps: 0,
    });

    act(() => {
      result.current.strategicPanelTitleRef.current = title;
      result.current.strategicDockRef.current = dock;
    });
    rerender(1);

    await waitFor(() => {
      expect(result.current.strategicDockLayout).toEqual({ left: 24, width: 200 });
      expect(result.current.isStrategicDockVisible).toBe(true);
    });
  });

  it('hides the dock outside cycle mode or while the workspace is unavailable', async () => {
    const title = document.createElement('a');
    assignRect(title, { left: 24, right: 224, top: 180 });

    const { result, rerender } = renderHook((props: {
      activeTab: 'all' | 'vertical';
      showCycleWorkspace: boolean;
    }) => useStrategicDockVisibility({
      activeTab: props.activeTab,
      isLoading: false,
      isOriginsLoading: false,
      loading: false,
      queueSuggestion: null,
      showCycleWorkspace: props.showCycleWorkspace,
      strategicAlertsLength: 1,
    }), {
      initialProps: {
        activeTab: 'all',
        showCycleWorkspace: true,
      },
    });

    act(() => {
      result.current.strategicPanelTitleRef.current = title;
    });
    rerender({
      activeTab: 'vertical',
      showCycleWorkspace: true,
    });

    await waitFor(() => {
      expect(result.current.isStrategicDockVisible).toBe(false);
    });

    rerender({
      activeTab: 'all',
      showCycleWorkspace: false,
    });

    await waitFor(() => {
      expect(result.current.isStrategicDockVisible).toBe(false);
    });
  });
});
