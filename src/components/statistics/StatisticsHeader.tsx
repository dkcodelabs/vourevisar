import { BarChart3, CalendarDays, Layers3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CycleStatisticsData, CycleStatisticsPeriod } from '@/types/cycleStatistics';
import { getDateLabel } from '@/utils/cycleStatistics';

const periods: CycleStatisticsPeriod[] = [7, 14, 30, 'all'];

type StatisticsHeaderProps = {
  data: CycleStatisticsData;
  period: CycleStatisticsPeriod;
  onPeriodChange: (period: CycleStatisticsPeriod) => void;
};

export function StatisticsHeader({ data, period, onPeriodChange }: StatisticsHeaderProps) {
  const examDateLabel = getDateLabel(data.examDate);

  const rawTitle = data.cycleName || data.editalLabel || 'Ciclo de estudos';
  const hasCustomCycleName = Boolean(data.cycleName && data.editalLabel && data.cycleName !== data.editalLabel);

  let mainTitle = rawTitle;
  let subtitle = hasCustomCycleName ? data.editalLabel : '';

  if (!hasCustomCycleName && rawTitle.includes(' - ')) {
    const parts = rawTitle.split(' - ');
    mainTitle = parts[0].trim();
    subtitle = parts.slice(1).join(' - ').trim();
  }

  return (
    <header className="app-strategic-map-panel overflow-hidden rounded-2xl px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="app-map-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 app-type-eyebrow text-primary">
              <BarChart3 className="size-3.5" aria-hidden="true" />
              Ciclo ativo
            </span>
            {data.combinedEditaisCount > 1 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-incidence/20 bg-incidence/10 px-2.5 py-1 app-type-caption text-incidence">
                <Layers3 className="size-3.5" aria-hidden="true" />
                {data.combinedEditaisCount} editais combinados
              </span>
            ) : null}
          </div>
          <h1 className="app-type-page-title app-title-page">Evolução</h1>
          <p className="mt-1 max-w-2xl app-type-page-subtitle app-text-muted">
            Veja o que seu estudo está construindo e onde vale concentrar o próximo esforço.
          </p>
          <div className="mt-3 flex flex-col gap-1">
            <div className="text-sm font-bold text-foreground">
              {mainTitle}
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-content-muted">
              {subtitle ? <span>{subtitle}</span> : null}
              {subtitle && examDateLabel ? <span className="opacity-40">·</span> : null}
              {examDateLabel ? (
                <span className="inline-flex items-center gap-1.5 text-primary font-medium">
                  <CalendarDays className="size-3.5 text-primary" aria-hidden="true" />
                  Prova em {examDateLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="app-control-surface flex w-full shrink-0 items-center gap-1 overflow-x-auto rounded-xl p-1 sm:w-auto" aria-label="Período analisado">
          {periods.map(option => (
            <button
              key={option}
              type="button"
              aria-pressed={period === option}
              onClick={() => onPeriodChange(option)}
              className={cn(
                'min-h-9 shrink-0 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                period === option
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-content-muted hover:bg-primary/8 hover:text-primary',
              )}
            >
              {option === 'all' ? 'Todo o ciclo' : `${option} dias`}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
