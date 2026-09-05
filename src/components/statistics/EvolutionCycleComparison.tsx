import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Info,
  Layers3,
  RefreshCw,
  Repeat2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { CycleComparisonData, CycleComparisonSnapshot } from '@/types/cycleComparison';

type EvolutionCycleComparisonProps = {
  comparison: CycleComparisonData | null | undefined;
  isLoading: boolean;
  isError: boolean;
  isRetrying: boolean;
  onRetry: () => void;
};

const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
}).format(new Date(value));

const formatDecimal = (value: number) => new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
}).format(value);

const getPaceMessage = (comparison: CycleComparisonData) => {
  const delta = comparison.deltas.startPacePerDay.absolute;
  if (Math.abs(delta) < 0.05) return 'O ritmo de novos tópicos ficou estável entre os dois giros.';
  return `Você iniciou ${formatDecimal(Math.abs(delta))} tópico ${delta > 0 ? 'a mais' : 'a menos'} por dia no último giro.`;
};

export function EvolutionCycleComparison({
  comparison,
  isLoading,
  isError,
  isRetrying,
  onRetry,
}: EvolutionCycleComparisonProps) {
  if (isLoading) {
    return <Skeleton className="h-60 rounded-2xl" aria-label="Carregando comparação entre giros" />;
  }

  if (isError) {
    return (
      <section className="app-surface rounded-2xl px-4 py-4 sm:px-5" aria-labelledby="cycle-comparison-error-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="app-type-eyebrow text-primary">Entre giros</p>
            <h2 id="cycle-comparison-error-title" className="mt-1 app-type-section-title app-title-section">
              Comparação indisponível agora
            </h2>
            <p className="mt-1 app-type-caption text-content-muted">Seu histórico continua salvo. Nenhum valor foi tratado como zero.</p>
          </div>
          <Button variant="outline" size="sm" onClick={onRetry} disabled={isRetrying} className="shrink-0">
            <RefreshCw className={isRetrying ? 'animate-spin' : ''} aria-hidden="true" />
            {isRetrying ? 'Tentando' : 'Tentar novamente'}
          </Button>
        </div>
      </section>
    );
  }

  if (!comparison) {
    return (
      <section className="app-surface rounded-2xl px-4 py-4 sm:px-5" aria-labelledby="cycle-comparison-empty-title">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Repeat2 className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="app-type-eyebrow text-primary">Entre giros</p>
            <h2 id="cycle-comparison-empty-title" className="mt-1 app-type-section-title app-title-section">
              A comparação aparece depois de concluir mais um giro
            </h2>
            <p className="mt-1 max-w-2xl app-type-caption text-content-muted">
              Vamos comparar apenas giros completos e consecutivos do ciclo atual, sem estimar o que ainda está em andamento.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const scopeChanged = comparison.comparability === 'scope_changed';

  return (
    <section className="app-surface overflow-hidden rounded-2xl" aria-labelledby="cycle-comparison-title">
      <div className="border-b app-hairline px-4 py-3.5 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="app-type-eyebrow text-primary">Entre giros</p>
            <h2 id="cycle-comparison-title" className="mt-1 app-type-section-title app-title-section">
              Último giro × giro anterior
            </h2>
          </div>
          <div className="flex items-center gap-2 app-type-caption font-semibold text-content-muted">
            <RotationLabel snapshot={comparison.previous} tone="muted" />
            <ArrowRight className="size-3.5" aria-hidden="true" />
            <RotationLabel snapshot={comparison.latest} tone="primary" />
          </div>
        </div>
      </div>

      {scopeChanged ? (
        <div className="flex items-start gap-2 border-b border-warning/20 bg-warning/[0.055] px-4 py-3 text-warning sm:px-5">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <p className="app-type-caption">
            O ciclo mudou entre os giros. Os valores permanecem visíveis, mas não são classificados como aumento ou queda.
          </p>
        </div>
      ) : null}

      <div className="grid divide-y divide-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
        <MetricPair icon={CalendarDays} label="Duração" previous={`${comparison.previous.durationDays}d`} latest={`${comparison.latest.durationDays}d`} />
        <MetricPair icon={Layers3} label="Matérias" previous={`${comparison.previous.studiedSubjectCount}/${comparison.previous.subjectCount}`} latest={`${comparison.latest.studiedSubjectCount}/${comparison.latest.subjectCount}`} />
        <MetricPair icon={BookOpenCheck} label="Iniciados" previous={String(comparison.previous.topicsStartedCount)} latest={String(comparison.latest.topicsStartedCount)} />
        <MetricPair icon={CheckCircle2} label="Consolidados" previous={String(comparison.previous.topicsCompletedCount)} latest={String(comparison.latest.topicsCompletedCount)} />
      </div>

      <div className="border-t app-hairline px-4 py-3 sm:px-5">
        <p className="app-type-caption text-content-muted">
          {scopeChanged
            ? 'Compare o contexto de cada giro; a composição diferente impede uma leitura direta de ritmo.'
            : getPaceMessage(comparison)}
        </p>
      </div>
    </section>
  );
}

function RotationLabel({ snapshot, tone }: { snapshot: CycleComparisonSnapshot; tone: 'muted' | 'primary' }) {
  return (
    <span className={tone === 'primary' ? 'text-primary' : 'text-content-muted'}>
      Giro {snapshot.cycleNumber} · {formatDate(snapshot.completedAt)}
    </span>
  );
}

function MetricPair({
  icon: Icon,
  label,
  previous,
  latest,
}: {
  icon: typeof CalendarDays;
  label: string;
  previous: string;
  latest: string;
}) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <p className="flex items-center gap-1.5 app-type-caption font-semibold text-content-muted">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </p>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-2 tabular-nums">
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-content-muted">Anterior</span>
          <strong className="mt-1 block text-lg font-extrabold leading-none text-foreground/75">{previous}</strong>
        </div>
        <ArrowRight className="mb-0.5 size-3.5 text-content-muted/60" aria-hidden="true" />
        <div className="text-right">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-primary">Último</span>
          <strong className="mt-1 block text-lg font-extrabold leading-none text-foreground">{latest}</strong>
        </div>
      </div>
    </div>
  );
}
