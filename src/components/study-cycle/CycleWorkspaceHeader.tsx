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
    <div className="mb-2 space-y-2 px-0">
      <div className="flex min-w-0 items-center gap-2">
        {isCycleMode ? (
          <ListTodo size={17} className="shrink-0 text-primary" />
        ) : (
          <FileText size={16} className="shrink-0 text-primary" />
        )}
        {isEditingTitle ? (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
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
              className="h-8 min-w-0 flex-1 rounded-lg border border-primary/35 bg-background px-2 text-sm font-black uppercase tracking-tight text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
              aria-label="Nome do ciclo"
            />
            <button
              type="button"
              onClick={() => void saveRename()}
              disabled={isSavingTitle}
              className="app-control h-8 w-8 shrink-0 p-0 text-success disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Salvar nome do ciclo"
              title="Salvar nome do ciclo"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={cancelRename}
              disabled={isSavingTitle}
              className="app-control h-8 w-8 shrink-0 p-0 text-content-muted disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Cancelar edição do nome do ciclo"
              title="Cancelar"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <h3 className="app-type-section-title min-w-0 break-words text-title-section">
              {title}
            </h3>
            {canRenameCycle && (
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="Editar nome do ciclo"
                title="Editar nome do ciclo"
              >
                <Pencil size={13} />
              </button>
            )}
          </>
        )}
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
