import { useId } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { DashboardDecisionModel, DashboardNavigate } from '@/types/dashboardDecision';

type ProgressSummaryCardProps = {
  summary: DashboardDecisionModel['progressSummary'];
  unstartedTopics: number;
  onNavigate: DashboardNavigate;
};

/** Current coverage, not completed reviews or retention. No data is recalculated here. */
export function ProgressSummaryCard({ summary, unstartedTopics, onNavigate }: ProgressSummaryCardProps) {
  const titleId = useId();
  const metrics = [
    { label: 'Iniciados', value: summary.startedTopics, color: 'bg-primary' },
    { label: 'Em andamento', value: summary.inProgressTopics, color: 'bg-warning' },
    { label: 'Não iniciados', value: unstartedTopics, color: 'bg-muted-foreground/45' },
    { label: 'Total de tópicos', value: summary.totalTopics, color: 'bg-border' },
  ];

  return (
    <Card role="region" aria-labelledby={titleId} className="dashboard-progress-card relative min-w-0 overflow-hidden rounded-2xl border-border/80 bg-card shadow-[0_16px_36px_-28px_hsl(222_47%_11%/0.4)]">
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <h2 id={titleId} className="text-sm font-semibold text-foreground">Progresso do edital</h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto min-h-11 shrink-0 gap-1 px-1 text-xs text-primary hover:bg-primary/5"
            aria-label="Ver progresso por matéria"
            onClick={() => onNavigate('/ciclo-estudos')}
          >
            Por matéria <ArrowRight aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-4">
          <div className="flex items-end justify-between gap-3">
            <p className="text-xs font-medium text-content-muted">Edital iniciado</p>
            <strong className="text-3xl font-extrabold leading-none tracking-[-0.04em] tabular-nums text-foreground">{summary.editalProgressPercentage}%</strong>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${summary.editalProgressPercentage}% do edital iniciado`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.editalProgressPercentage}>
            <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${summary.editalProgressPercentage}%` }} />
          </div>
          <dl className="mt-4 grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 sm:gap-x-3">
            {metrics.map(metric => (
              <div key={metric.label} className="min-w-0 border-l border-border/80 pl-2.5 first:border-l-0 first:pl-0 sm:border-l sm:pl-3 sm:first:border-l-0 sm:first:pl-0">
                <dt className="truncate text-[10px] font-medium text-content-muted">{metric.label}</dt>
                <dd className="mt-1 text-base font-bold leading-none tabular-nums text-foreground">{metric.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Card>
  );
}
