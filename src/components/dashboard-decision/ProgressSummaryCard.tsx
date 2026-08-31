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
    <Card role="region" aria-labelledby={titleId} className="min-w-0 overflow-hidden rounded-2xl border-primary/15 bg-[radial-gradient(circle_at_85%_5%,hsl(var(--primary)/0.12),transparent_34%),linear-gradient(145deg,hsl(var(--card)),hsl(var(--surface)))] shadow-sm">
      <div className="p-3 sm:p-4 xl:p-5">
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

        <div className="mt-1 grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 xl:mt-3 xl:grid-cols-[86px_minmax(0,1fr)]">
          <div
            className="grid size-14 place-items-center rounded-full p-1 xl:size-[86px] xl:p-[7px]"
            style={{ background: `conic-gradient(hsl(var(--primary)) 0 ${summary.editalProgressPercentage}%, hsl(var(--border)) ${summary.editalProgressPercentage}% 100%)` }}
            role="img"
            aria-label={`${summary.editalProgressPercentage}% do edital iniciado`}
          >
            <div className="grid size-full place-items-center rounded-full bg-card text-center">
              <div>
                <span className="block text-base font-bold tabular-nums leading-none text-foreground xl:text-xl">{summary.editalProgressPercentage}%</span>
                <span className="mt-1 hidden text-[9px] text-content-muted xl:block">edital iniciado</span>
              </div>
            </div>
          </div>

          <dl className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2 xl:grid-cols-1 xl:gap-y-2.5">
            {metrics.map(metric => (
              <div key={metric.label} className="flex min-w-0 items-baseline justify-between gap-1 text-[11px]">
                <dt className="min-w-0 text-content-muted">
                  <span aria-hidden="true" className={`mr-1.5 hidden size-2 rounded-sm xl:inline-block ${metric.color}`} />
                  {metric.label}
                </dt>
                <dd className="shrink-0 font-semibold tabular-nums text-foreground">{metric.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Card>
  );
}
