import { useEffect, useRef, useState } from 'react';

type SubjectTab = 'all' | 'vertical';

type StrategicDockLayout = {
  left: number;
  width: number;
};

type UseStrategicDockVisibilityInput = {
  activeTab: SubjectTab;
  isLoading: boolean;
  isOriginsLoading: boolean;
  loading: boolean;
  queueSuggestion?: unknown;
  showCycleWorkspace: boolean;
  strategicAlertsLength: number;
};

export function useStrategicDockVisibility({
  activeTab,
  isLoading,
  isOriginsLoading,
  loading,
  queueSuggestion,
  showCycleWorkspace,
  strategicAlertsLength,
}: UseStrategicDockVisibilityInput) {
  const strategicPanelTitleRef = useRef<HTMLAnchorElement | null>(null);
  const strategicPanelRef = useRef<HTMLElement | null>(null);
  const strategicDockRef = useRef<HTMLAnchorElement | null>(null);
  const [isStrategicDockVisible, setIsStrategicDockVisible] = useState(false);
  const [strategicDockLayout, setStrategicDockLayout] = useState<StrategicDockLayout>({ left: 16, width: 0 });

  useEffect(() => {
    if (activeTab !== 'all' || loading || isLoading || isOriginsLoading || !showCycleWorkspace) {
      setIsStrategicDockVisible(false);
      return;
    }

    const title = strategicPanelTitleRef.current;
    if (!title) {
      setIsStrategicDockVisible(false);
      return;
    }

    let frameId = 0;
    const updateDockVisibility = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const titleRect = title.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const left = Math.max(8, Math.round(titleRect.left));
        const right = Math.min(viewportWidth - 8, Math.round(titleRect.right));
        const width = Math.max(0, right - left);
        const dockTop = strategicDockRef.current?.getBoundingClientRect().top ?? viewportHeight - 52;

        setStrategicDockLayout(previous =>
          previous.left === left && previous.width === width ? previous : { left, width }
        );
        setIsStrategicDockVisible(width > 0 && titleRect.top > dockTop);
      });
    };

    updateDockVisibility();
    window.addEventListener('resize', updateDockVisibility);
    window.addEventListener('scroll', updateDockVisibility, { passive: true });
    document.addEventListener('scroll', updateDockVisibility, true);
    window.visualViewport?.addEventListener('resize', updateDockVisibility);
    window.visualViewport?.addEventListener('scroll', updateDockVisibility);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updateDockVisibility);
      window.removeEventListener('scroll', updateDockVisibility);
      document.removeEventListener('scroll', updateDockVisibility, true);
      window.visualViewport?.removeEventListener('resize', updateDockVisibility);
      window.visualViewport?.removeEventListener('scroll', updateDockVisibility);
    };
  }, [activeTab, isLoading, isOriginsLoading, loading, queueSuggestion, showCycleWorkspace, strategicAlertsLength]);

  return {
    isStrategicDockVisible,
    strategicDockLayout,
    strategicDockRef,
    strategicPanelRef,
    strategicPanelTitleRef,
  };
}
