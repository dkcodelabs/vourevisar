import { Check, Loader2, X } from 'lucide-react';

export type ImportJourneyStage = 'analyzing' | 'selectCargo' | 'extracting' | 'review';

type ImportJourneyProgressProps = {
  stage: ImportJourneyStage;
  onSecondaryAction: () => void;
};

const steps = [
  { key: 'document', label: 'Documento' },
  { key: 'cargo', label: 'Cargo' },
  { key: 'review', label: 'Revisão' },
] as const;

const activeStepByStage: Record<ImportJourneyStage, number> = {
  analyzing: 0,
  selectCargo: 1,
  extracting: 1,
  review: 2,
};

const actionLabelByStage: Record<ImportJourneyStage, string> = {
  analyzing: 'Cancelar análise',
  extracting: 'Cancelar extração',
  selectCargo: 'Trocar documento',
  review: 'Voltar ao cargo',
};

export function ImportJourneyProgress({ stage, onSecondaryAction }: ImportJourneyProgressProps) {
  const activeStep = activeStepByStage[stage];
  const isProcessing = stage === 'analyzing' || stage === 'extracting';

  return (
    <div className="rounded-xl border border-border/70 bg-secondary/30 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ol className="grid min-w-0 flex-1 grid-cols-3" aria-label="Progresso da importação">
          {steps.map((step, index) => {
            const isComplete = index < activeStep;
            const isActive = index === activeStep;

            return (
              <li
                key={step.key}
                aria-current={isActive ? 'step' : undefined}
                className="relative flex min-w-0 items-center gap-2 pr-2 last:pr-0"
              >
                <span
                  className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                    isComplete
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-500'
                      : isActive
                        ? 'border-primary/50 bg-primary/15 text-primary'
                        : 'border-border bg-card text-content-muted dark:border-white/10'
                  }`}
                >
                  {isComplete ? <Check size={13} aria-hidden="true" /> : isActive && isProcessing ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : index + 1}
                </span>
                <span className={`truncate text-[11px] font-semibold ${isActive || isComplete ? 'text-foreground' : 'text-content-muted'}`}>
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>

        <button
          type="button"
          onClick={onSecondaryAction}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold text-content-muted transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:min-h-9"
        >
          {isProcessing ? <X size={14} aria-hidden="true" /> : null}
          {actionLabelByStage[stage]}
        </button>
      </div>
    </div>
  );
}
