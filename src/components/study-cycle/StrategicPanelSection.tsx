import type { ComponentProps, RefObject } from 'react';
import { Shield } from 'lucide-react';

import { StrategicEditalPanel } from '@/components/study-cycle/StrategicEditalPanel';

type StrategicPanelSectionProps = ComponentProps<typeof StrategicEditalPanel> & {
  isStrategicDockVisible: boolean;
  strategicDockLayout: { left: number; width: number };
  strategicDockRef: RefObject<HTMLAnchorElement | null>;
  strategicPanelTitleRef: RefObject<HTMLAnchorElement | null>;
};

export function StrategicPanelSection({
  isStrategicDockVisible,
  strategicDockLayout,
  strategicDockRef,
  strategicPanelTitleRef,
  ...panelProps
}: StrategicPanelSectionProps) {
  const scrollToPanelTitle = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    strategicPanelTitleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-w-0">
      <div className="mb-2 space-y-2 px-0">
        <a
          ref={strategicPanelTitleRef}
          href="#strategic-cycle-panel"
          onClick={scrollToPanelTitle}
          className="inline-flex w-fit max-w-full min-w-0 scroll-mt-20 items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-title-section transition-colors hover:text-primary"
        >
          <Shield size={17} className="shrink-0 text-primary" />
          <span className="app-type-section-title min-w-0 truncate">
            Painel estratégico do edital
          </span>
        </a>
        <div className="hidden h-11 xl:block" aria-hidden="true" />
      </div>

      <a
        ref={strategicDockRef}
        href="#strategic-cycle-panel"
        aria-hidden={!isStrategicDockVisible}
        tabIndex={isStrategicDockVisible ? 0 : -1}
        onClick={scrollToPanelTitle}
        style={{ left: strategicDockLayout.left, width: strategicDockLayout.width }}
        className={`fixed bottom-3 z-40 inline-flex min-w-0 items-center gap-2 rounded-lg border app-hairline bg-surface/60 px-2 py-1.5 text-primary shadow-lg shadow-primary/5 backdrop-blur-md transition-[opacity,transform,background-color] duration-150 ease-out hover:bg-surface/75 ${
          isStrategicDockVisible
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-1 opacity-0'
        }`}
      >
        <Shield size={17} className="shrink-0 text-primary" />
        <span className="app-type-section-title min-w-0 truncate">
          Painel estratégico do edital
        </span>
      </a>

      <StrategicEditalPanel {...panelProps} />
    </div>
  );
}
