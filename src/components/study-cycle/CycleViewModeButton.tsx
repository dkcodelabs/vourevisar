import { FileText } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type CycleViewModeButtonProps = {
  activeTab: 'all' | 'vertical';
  onToggle: () => void;
};

export function CycleViewModeButton({
  activeTab,
  onToggle,
}: CycleViewModeButtonProps) {
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onToggle}
            className="app-control app-type-control h-7 shrink-0 gap-1.5 px-1.5 sm:px-2"
            aria-label={activeTab === 'vertical' ? 'Voltar para o modo ciclo' : 'Ver conteúdo em modo edital'}
          >
            <FileText size={11} />
            <span className="hidden min-[760px]:inline xl:inline">
              {activeTab === 'vertical' ? 'Modo ciclo' : 'Modo edital'}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {activeTab === 'vertical' ? 'Voltar para o modo ciclo' : 'Ver conteúdo em modo edital'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
