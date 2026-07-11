import { Check, GripVertical } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type CycleReorderButtonProps = {
  isReorderingCycle: boolean;
  onToggle: () => void;
  reorderDisabled: boolean;
};

export function CycleReorderButton({
  isReorderingCycle,
  onToggle,
  reorderDisabled,
}: CycleReorderButtonProps) {
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onToggle}
            disabled={reorderDisabled}
            className={`app-type-control inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border px-1.5 transition-colors sm:px-2 ${
              isReorderingCycle
                ? 'border-warning/45 bg-warning/15 text-warning shadow-[0_0_18px_hsl(var(--warning)/0.12)]'
                : 'app-control disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:text-content-muted'
            }`}
            aria-pressed={isReorderingCycle}
            aria-label={
              reorderDisabled
                ? 'Organização disponível apenas no modo ciclo'
                : isReorderingCycle
                  ? 'Concluir organização da fila'
                  : 'Organizar ordem da fila'
            }
          >
            {isReorderingCycle ? <Check size={11} /> : <GripVertical size={12} />}
            <span className="hidden min-[760px]:inline xl:inline">
              {isReorderingCycle ? 'OK' : 'Organizar'}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {reorderDisabled ? 'Disponível no modo ciclo' : isReorderingCycle ? 'Concluir organização' : 'Organizar ordem'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
