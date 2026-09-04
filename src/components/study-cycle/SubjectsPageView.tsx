import type { ReactNode } from 'react';
import type { ComponentProps } from 'react';

import { CycleEmptyState } from '@/components/study-cycle/CycleEmptyState';
import { SubjectsModalLayer } from '@/components/study-cycle/SubjectsModalLayer';
import type { CycleEntryState } from '@/utils/cycleEntryState';

type SubjectsPageViewProps = {
  cycleEntryState: CycleEntryState;
  hasActiveCycle: boolean;
  isImportEditalModalOpen: boolean;
  modalLayerProps: ComponentProps<typeof SubjectsModalLayer>;
  onGoToEditais: () => void;
  onOpenImport: (tab: 'ready' | 'ia' | 'manual') => void;
  showCycleWorkspace: boolean;
  workspace: ReactNode;
};

export function SubjectsPageView({
  cycleEntryState,
  hasActiveCycle,
  isImportEditalModalOpen,
  modalLayerProps,
  onGoToEditais,
  onOpenImport,
  showCycleWorkspace,
  workspace,
}: SubjectsPageViewProps) {
  return (
    <div className="flex w-full font-sans text-foreground">
      <div className="flex-1 flex flex-col relative w-full">
        <main className="flex-1 px-0 pb-8 pt-0 flex flex-col gap-6">
          <div className="flex-1 min-w-0 w-full">
            {!isImportEditalModalOpen && (
              showCycleWorkspace ? workspace : (
                <div className="flex min-h-[520px] w-full items-center justify-center text-center">
                  <div className="w-full max-w-3xl">
                    <CycleEmptyState
                      state={cycleEntryState}
                      onGoToEditais={onGoToEditais}
                      onOpenImport={onOpenImport}
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </main>

        <SubjectsModalLayer {...modalLayerProps} />
      </div>
    </div>
  );
}
