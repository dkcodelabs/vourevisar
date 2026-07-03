import type { ReactNode } from 'react';
import { ChevronDown, FileText, ListTodo } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type CycleWorkspaceHeaderProps = {
  allExpanded: boolean;
  canToggleAll: boolean;
  count: number;
  isCycleMode: boolean;
  onToggleAll: () => void;
  reorderControl: ReactNode;
  searchControl: ReactNode;
  title: string;
  viewModeControl: ReactNode;
};

export function CycleWorkspaceHeader({
  allExpanded,
  canToggleAll,
  count,
  isCycleMode,
  onToggleAll,
  reorderControl,
  searchControl,
  title,
  viewModeControl,
}: CycleWorkspaceHeaderProps) {
  const toggleLabel = allExpanded ? 'Recolher todas as matérias' : 'Expandir todas as matérias';

  return (
    <div className="mb-2 space-y-2 px-0">
      <div className="flex min-w-0 items-center gap-2">
        {isCycleMode ? (
          <ListTodo size={17} className="shrink-0 text-primary" />
        ) : (
          <FileText size={16} className="shrink-0 text-primary" />
        )}
        <h3 className="app-type-section-title min-w-0 break-words text-title-section">
          {title}
        </h3>
        <span className="app-type-badge shrink-0 rounded-md bg-primary/8 px-1.5 py-0.5 text-primary">
          ({count})
        </span>
      </div>
      <div className="app-glass app-cycle-toolbar rounded-2xl px-2 py-2">
        <div className="app-cycle-toolbar-primary">
          {reorderControl}
          {searchControl}
        </div>
        <div className="app-cycle-toolbar-secondary">
          {viewModeControl}
          <TooltipProvider delayDuration={120}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleAll}
                  disabled={!canToggleAll}
                  className="app-control app-type-control h-7 shrink-0 gap-1 px-1.5 disabled:cursor-not-allowed disabled:opacity-35 sm:px-2"
                  aria-label={toggleLabel}
                >
                  <ChevronDown
                    size={11}
                    className={`transition-transform ${allExpanded ? 'rotate-180' : ''}`}
                  />
                  <span className="hidden min-[760px]:inline xl:inline">
                    {allExpanded ? 'Recolher' : 'Expandir'}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {allExpanded ? 'Recolher todos' : 'Expandir todos'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
