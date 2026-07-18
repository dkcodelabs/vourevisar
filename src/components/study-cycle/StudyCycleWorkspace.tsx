import type { ComponentProps } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';

import { CycleEmptyState } from '@/components/study-cycle/CycleEmptyState';
import { CycleFirstContactFinishedPanel } from '@/components/study-cycle/CycleFirstContactFinishedPanel';
import { CycleQueueList } from '@/components/study-cycle/CycleQueueList';
import { CycleVerticalWorkspaceSection } from '@/components/study-cycle/CycleVerticalWorkspaceSection';
import { CycleWorkspaceHeaderSection } from '@/components/study-cycle/CycleWorkspaceHeaderSection';
import { StrategicPanelSection } from '@/components/study-cycle/StrategicPanelSection';
import type { CycleEntryState } from '@/utils/cycleEntryState';

type StudyCycleWorkspaceProps = {
  activeTab: 'all' | 'vertical';
  cycleTransitionSummary: ComponentProps<typeof CycleFirstContactFinishedPanel>['summary'];
  cycleEntryState: CycleEntryState;
  dataLoaded: boolean;
  displayListLength: number;
  firstContactFormatStudyMinutes: ComponentProps<typeof CycleFirstContactFinishedPanel>['formatStudyMinutes'];
  hasActiveCycle: boolean;
  hasMore: boolean;
  isCycleFullyStudied: boolean;
  isLoading: boolean;
  localSubjectsCount: number;
  onGoToEditais: () => void;
  onLoadMore: () => void;
  onNavigate: (to: string) => void;
  onStartNextCycle: () => void;
  queueProps: ComponentProps<typeof CycleQueueList>;
  remainingItemsCount: number;
  strategicPanelProps: ComponentProps<typeof StrategicPanelSection>;
  verticalWorkspaceProps: ComponentProps<typeof CycleVerticalWorkspaceSection>;
  workspaceHeaderProps: ComponentProps<typeof CycleWorkspaceHeaderSection>;
  dndContextProps: Pick<ComponentProps<typeof DndContext>, 'onDragEnd' | 'onDragStart' | 'sensors'>;
};

export function StudyCycleWorkspace({
  activeTab,
  cycleTransitionSummary,
  cycleEntryState,
  dataLoaded,
  displayListLength,
  dndContextProps,
  firstContactFormatStudyMinutes,
  hasActiveCycle,
  hasMore,
  isCycleFullyStudied,
  isLoading,
  localSubjectsCount,
  onGoToEditais,
  onLoadMore,
  onNavigate,
  onStartNextCycle,
  queueProps,
  remainingItemsCount,
  strategicPanelProps,
  verticalWorkspaceProps,
  workspaceHeaderProps,
}: StudyCycleWorkspaceProps) {
  const workspaceHeader = <CycleWorkspaceHeaderSection {...workspaceHeaderProps} />;

  if (activeTab === 'vertical') {
    return (
      <div className="space-y-6 w-full">
        <div className="space-y-3">
          {workspaceHeader}
          <CycleVerticalWorkspaceSection {...verticalWorkspaceProps} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.58fr)] xl:gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.54fr)] items-start">
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={dndContextProps.onDragEnd}
          onDragStart={dndContextProps.onDragStart}
          sensors={dndContextProps.sensors}
        >
          <div className="w-full min-w-0">
            {workspaceHeader}

            {(displayListLength === 0 && dataLoaded && !isLoading) ? (
              <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500 w-full mb-12">
                {localSubjectsCount > 0 && hasActiveCycle && isCycleFullyStudied ? (
                  <CycleFirstContactFinishedPanel
                    cycleRoundComplete={isCycleFullyStudied}
                    formatStudyMinutes={firstContactFormatStudyMinutes}
                    onNavigate={onNavigate}
                    onStartNextCycle={onStartNextCycle}
                    summary={cycleTransitionSummary}
                    variant="full"
                  />
                ) : (
                  <CycleEmptyState
                    state={cycleEntryState}
                    onGoToEditais={onGoToEditais}
                  />
                )}
              </div>
            ) : (
              <>
                {isCycleFullyStudied && (
                  <CycleFirstContactFinishedPanel
                    cycleRoundComplete={isCycleFullyStudied}
                    formatStudyMinutes={firstContactFormatStudyMinutes}
                    onNavigate={onNavigate}
                    onStartNextCycle={onStartNextCycle}
                    summary={cycleTransitionSummary}
                    variant="compact"
                  />
                )}

                <CycleQueueList {...queueProps} />
              </>
            )}

            {hasMore && (
              <div className="mt-8 flex justify-center pb-12">
                <button
                  onClick={onLoadMore}
                  className="app-surface group relative flex items-center gap-3 overflow-hidden rounded-2xl px-8 py-3 transition-all hover:border-primary/50 hover:bg-primary/5"
                  type="button"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <RefreshCw size={16} className="text-primary group-hover:rotate-180 transition-transform duration-500" />
                  <span className="text-xs font-bold text-foreground group-hover:text-primary tracking-widest uppercase">
                    Ver mais matérias ({remainingItemsCount} restantes)
                  </span>
                  <ChevronDown size={14} className="text-content-muted group-hover:translate-y-0.5 transition-transform" />
                </button>
              </div>
            )}
          </div>

          <StrategicPanelSection {...strategicPanelProps} />
        </DndContext>
      </div>
    </div>
  );
}
