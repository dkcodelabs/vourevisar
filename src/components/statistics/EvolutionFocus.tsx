import { ArrowRight, Compass, ShieldAlert, Sparkles, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CycleStatisticsInsight } from '@/types/cycleStatistics';

type EvolutionFocusProps = {
  insight: CycleStatisticsInsight;
  onAction: () => void;
};

const tones = {
  neutral: {
    icon: Compass,
    shell: 'border-primary/20 bg-primary/6',
    iconClass: 'bg-primary/12 text-primary',
  },
  positive: {
    icon: Sparkles,
    shell: 'border-success/20 bg-success/7',
    iconClass: 'bg-success/12 text-success',
  },
  attention: {
    icon: TriangleAlert,
    shell: 'border-warning/25 bg-warning/7',
    iconClass: 'bg-warning/12 text-warning',
  },
  critical: {
    icon: ShieldAlert,
    shell: 'border-destructive/25 bg-destructive/7',
    iconClass: 'bg-destructive/12 text-destructive',
  },
} as const;

export function EvolutionFocus({ insight, onAction }: EvolutionFocusProps) {
  const tone = tones[insight.tone];
  const Icon = tone.icon;

  return (
    <section
      className={cn('relative overflow-hidden rounded-2xl border p-4 sm:p-5', tone.shell)}
      aria-labelledby="evolution-focus-title"
    >
      <div className="pointer-events-none absolute -right-12 -top-16 size-48 rounded-full bg-primary/8 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tone.iconClass)}>
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="app-type-eyebrow text-content-muted">Seu foco agora</p>
            <h2 id="evolution-focus-title" className="mt-1 app-type-section-title text-foreground">
              {insight.title}
            </h2>
            <p className="mt-1.5 max-w-2xl app-type-body-small leading-relaxed text-content-muted">
              {insight.description}
            </p>
            <p className="mt-2 app-type-caption font-semibold text-foreground/80">{insight.evidence}</p>
          </div>
        </div>
        <Button className="w-full shrink-0 sm:w-auto" size="sm" onClick={onAction}>
          {insight.actionLabel}
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
