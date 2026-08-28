import { CheckCircle2, CircleDot, Telescope } from 'lucide-react';
import type { CycleStatisticsProgress, CycleStatisticsTime } from '@/types/cycleStatistics';
import { formatStudyMinutes } from '@/utils/cycleStatistics';

type EvolutionOverviewProps = {
  progress: CycleStatisticsProgress;
  time: CycleStatisticsTime;
};

export function EvolutionOverview({ progress, time }: EvolutionOverviewProps) {
  const developmentPercentage = progress.total > 0
    ? (progress.inDevelopment / progress.total) * 100
    : 0;
  const completedPercentage = progress.total > 0
    ? (progress.completed / progress.total) * 100
    : 0;
  const notStartedPercentage = Math.max(0, 100 - developmentPercentage - completedPercentage);

  return (
    <section className="app-surface overflow-hidden rounded-2xl" aria-labelledby="evolution-moment-title">
      <div className="border-b app-hairline px-4 py-3.5 sm:px-5">
        <p className="app-type-eyebrow text-primary">Seu momento</p>
        <h2 id="evolution-moment-title" className="mt-1 app-type-section-title app-title-section">
          Do primeiro contato à consolidação
        </h2>
      </div>

      <div className="px-4 py-5 sm:px-5">
        <div
          className="flex h-3 w-full overflow-hidden rounded-full bg-muted/70"
          role="img"
          aria-label={`${progress.completed} consolidados, ${progress.inDevelopment} em desenvolvimento e ${progress.notStarted} não iniciados`}
        >
          {completedPercentage > 0 && (
            <span className="h-full bg-success transition-all duration-500" style={{ width: `${completedPercentage}%` }} />
          )}
          {developmentPercentage > 0 && (
            <span className="h-full bg-gradient-to-r from-primary to-info transition-all duration-500" style={{ width: `${developmentPercentage}%` }} />
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-content-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success" />
            Consolidados ({progress.completed})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" />
            Em desenvolvimento ({progress.inDevelopment})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-muted-foreground/30" />
            Não iniciados ({progress.notStarted})
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-4">
          <Metric
            icon={Telescope}
            label="Cobertura"
            value={`${progress.coveragePercentage}%`}
            helper={`${progress.started} de ${progress.total} tópicos iniciados`}
            tone="primary"
          />
          <Metric
            icon={CheckCircle2}
            label="Consolidação"
            value={`${progress.completionPercentage}%`}
            helper={`${progress.completed} concluíram quatro revisões`}
            tone="success"
          />
          <Metric
            icon={CircleDot}
            label="Em desenvolvimento"
            value={String(progress.inDevelopment)}
            helper="Iniciados, ainda não consolidados"
            tone="info"
          />
          <Metric
            icon={CircleDot}
            label={time.isAllCycle ? 'Tempo no ciclo' : `Tempo em ${time.periodDays} dias`}
            value={formatStudyMinutes(time.totalMinutes)}
            helper={`${time.activeDays} ${time.activeDays === 1 ? 'dia ativo' : 'dias ativos'}`}
            tone="neutral"
          />
        </div>
      </div>
    </section>
  );
}

type MetricProps = {
  icon: typeof Telescope;
  label: string;
  value: string;
  helper: string;
  tone: 'primary' | 'success' | 'info' | 'neutral';
};

const toneClasses: Record<MetricProps['tone'], string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  info: 'bg-info/10 text-info',
  neutral: 'bg-muted text-content-muted',
};

function Metric({ icon: Icon, label, value, helper, tone }: MetricProps) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${toneClasses[tone]}`}>
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        <span className="app-type-caption text-content-muted">{label}</span>
      </div>
      <strong className="mt-2 block text-[clamp(1.2rem,1.05rem+0.65vw,1.75rem)] font-extrabold leading-none tracking-tight text-foreground">
        {value}
      </strong>
      <span className="mt-1.5 block app-type-caption text-content-muted">{helper}</span>
    </div>
  );
}
