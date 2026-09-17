import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, ChevronDown, FileText, ListTodo, Pencil, X } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type CycleWorkspaceHeaderProps = {
  allExpanded: boolean;
  canToggleAll: boolean;
  count: number;
  isCycleMode: boolean;
  onRenameCycle?: (name: string) => Promise<void>;
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
  onRenameCycle,
  onToggleAll,
  reorderControl,
  searchControl,
  title,
  viewModeControl,
}: CycleWorkspaceHeaderProps) {
  const toggleLabel = allExpanded ? 'Recolher todas as matérias' : 'Expandir todas as matérias';
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const canRenameCycle = isCycleMode && Boolean(onRenameCycle);

  useEffect(() => {
    if (!isEditingTitle) setTitleDraft(title);
  }, [isEditingTitle, title]);

  const cancelRename = () => {
    setTitleDraft(title);
    setIsEditingTitle(false);
  };

  const saveRename = async () => {
    const cleanName = titleDraft.trim().replace(/\s+/g, ' ');
    if (!cleanName || cleanName === title || !onRenameCycle) {
      cancelRename();
      return;
    }

    setIsSavingTitle(true);
    try {
      await onRenameCycle(cleanName);
      setIsEditingTitle(false);
    } finally {
      setIsSavingTitle(false);
    }
  };

  return (
    <div className="mb-4 space-y-3 px-0">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-primary">
            {isCycleMode ? (
              <ListTodo size={13} className="shrink-0" />
            ) : (
              <FileText size={13} className="shrink-0" />
            )}
            {isCycleMode ? 'Fila do Ciclo' : 'Edital Verticalizado'}
          </span>
          <span className="text-[11px] font-medium text-content-muted">
            • {count} {count === 1 ? 'matéria' : 'matérias'}
          </span>
        </div>

        {isEditingTitle ? (
          <div className="flex min-w-0 items-center gap-1.5 pt-1">
            <input
              type="text"
              value={titleDraft}
              onChange={event => setTitleDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void saveRename();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  cancelRename();
                }
              }}
              disabled={isSavingTitle}
              autoFocus
              maxLength={160}
              className="h-9 min-w-0 flex-1 rounded-xl border border-primary/40 bg-surface px-3 text-sm font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
              aria-label="Nome do ciclo"
            />
            <button
              type="button"
              onClick={() => void saveRename()}
              disabled={isSavingTitle}
              className="app-control h-9 w-9 shrink-0 p-0 text-success hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Salvar nome do ciclo"
              title="Salvar nome do ciclo"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={cancelRename}
              disabled={isSavingTitle}
              className="app-control h-9 w-9 shrink-0 p-0 text-content-muted hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Cancelar edição do nome do ciclo"
              title="Cancelar"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-2 pt-0.5">
            <h3 className="min-w-0 flex-1 break-words text-base sm:text-lg font-bold tracking-tight text-title-section leading-snug">
              {title}
            </h3>
            {canRenameCycle && (
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-content-muted/70 transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="Editar nome do ciclo"
                title="Editar nome do ciclo"
              >
                <Pencil size={13} />
              </button>
            )}
          </div>
        )}
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
