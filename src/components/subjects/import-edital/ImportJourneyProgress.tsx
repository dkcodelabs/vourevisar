import React from 'react';
import { Check, Loader2 } from 'lucide-react';

export type ImportJourneyStage = 'analyzing' | 'selectCargo' | 'extracting' | 'review';

type ImportJourneyProgressProps = {
  stage: ImportJourneyStage;
  onSecondaryAction?: () => void;
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

export function ImportJourneyProgress({ stage }: ImportJourneyProgressProps) {
  const activeStep = activeStepByStage[stage];
  const isProcessing = stage === 'analyzing' || stage === 'extracting';

  return (
    <div className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <ol className="flex items-center justify-center gap-3 sm:gap-6" aria-label="Progresso da importação">
        {steps.map((step, index) => {
          const isComplete = index < activeStep;
          const isActive = index === activeStep;

          return (
            <React.Fragment key={step.key}>
              {index > 0 && (
                <div
                  className={`h-px w-6 sm:w-10 transition-colors ${
                    index <= activeStep ? 'bg-primary/50' : 'bg-border dark:bg-white/10'
                  }`}
                  aria-hidden="true"
                />
              )}
              <li
                aria-current={isActive ? 'step' : undefined}
                className="flex items-center gap-2 shrink-0"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors ${
                    isComplete
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-500'
                      : isActive
                        ? 'border-primary/50 bg-primary/15 text-primary'
                        : 'border-border bg-card text-content-muted dark:border-white/10'
                  }`}
                >
                  {isComplete ? (
                    <Check size={13} aria-hidden="true" />
                  ) : isActive && isProcessing ? (
                    <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    isActive || isComplete ? 'text-foreground' : 'text-content-muted'
                  }`}
                >
                  {step.label}
                </span>
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </div>
  );
}
