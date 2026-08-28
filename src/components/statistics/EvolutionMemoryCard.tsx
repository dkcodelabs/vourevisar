import { Brain, CalendarClock, CircleAlert } from 'lucide-react';
import type { CycleStatisticsMemory } from '@/types/cycleStatistics';

type EvolutionMemoryCardProps = {
  memory: CycleStatisticsMemory;
};

export function EvolutionMemoryCard({ memory }: EvolutionMemoryCardProps) {
  const maturityTotal = memory.learning + memory.fixing + memory.mastering;

  return (
    <section className="app-surface rounded-2xl p-4 sm:p-5" aria-labelledby="evolution-memory-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="app-type-eyebrow text-primary">Memória e revisões</p>
          <h2 id="evolution-memory-title" className="mt-1 app-type-section-title app-title-section">
            Maturidade do conteúdo
          </h2>
        </div>
        <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <Brain className="size-4.5" aria-hidden="true" />
        </span>
      </div>

      {maturityTotal === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/35 px-4 py-5 text-center">
          <p className="app-type-card-title text-foreground">Histórico em formação</p>
          <p className="mt-1 app-type-caption text-content-muted">
            Os estágios aparecem depois do primeiro contato com os tópicos.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <MaturityRow label="Aprendendo" value={memory.learning} total={maturityTotal} className="bg-warning" />
          <MaturityRow label="Fixando" value={memory.fixing} total={maturityTotal} className="bg-primary" />
          <MaturityRow label="Dominando" value={memory.mastering} total={maturityTotal} className="bg-success" />
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 border-t app-hairline pt-4">
        <div className="rounded-xl bg-destructive/7 px-3 py-3">
          <div className="flex items-center gap-2 app-type-caption text-destructive">
            <CircleAlert className="size-3.5" aria-hidden="true" />
            Vencidas
          </div>
          <strong className="mt-1 block text-lg font-extrabold text-foreground">{memory.overdue}</strong>
        </div>
        <div className="rounded-xl bg-primary/7 px-3 py-3">
          <div className="flex items-center gap-2 app-type-caption text-primary">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            Hoje / futuras
          </div>
          <strong className="mt-1 block text-lg font-extrabold text-foreground">
            {memory.dueToday} / {memory.future}
          </strong>
        </div>
      </div>

      <p className="mt-3 app-type-caption leading-relaxed text-content-muted">
        Classificação do motor adaptativo atual. Não representa uma porcentagem de retenção medida.
      </p>
    </section>
  );
}

function MaturityRow({
  label,
  value,
  total,
  className,
}: {
  label: string;
  value: number;
  total: number;
  className: string;
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 app-type-caption">
        <span className="text-content-muted">{label}</span>
        <strong className="text-foreground">{value}</strong>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${className}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
