import { ArrowUpRight, BarChart3, BookOpen, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DashboardSubjectPerformance } from '@/types/dashboardDecision';

export interface DashboardSubjectPerformanceTableProps {
  performance: DashboardSubjectPerformance[];
  onNavigate?: (href: string) => void;
  className?: string;
}

const formatMinutes = (totalMinutes: number): string => {
  if (!totalMinutes || totalMinutes <= 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
};

// Mini anel circular SVG de progresso
const AccuracyRing = ({ percentage }: { percentage: number | null }) => {
  if (percentage === null) {
    return (
      <div className="flex items-center justify-end gap-1.5" title="Sem questões respondidas">
        <span className="size-5 rounded-full border-2 border-border/60 border-dashed dark:border-white/20" />
        <span className="text-[11px] font-medium text-muted-foreground tabular-nums">—</span>
      </div>
    );
  }

  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  let colorClass = 'text-red-500';
  let badgeColor = 'text-red-500';
  if (percentage >= 70) {
    colorClass = 'text-emerald-500 dark:text-[#b7fb45]';
    badgeColor = 'text-emerald-600 dark:text-[#b7fb45]';
  } else if (percentage >= 50) {
    colorClass = 'text-amber-500';
    badgeColor = 'text-amber-600 dark:text-amber-400';
  }

  return (
    <div className="flex items-center justify-end gap-2" title={`Taxa de acerto: ${percentage}%`}>
      <svg className="size-6 -rotate-90 transform" viewBox="0 0 24 24" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r={radius}
          className="stroke-muted/40 dark:stroke-white/[0.08]"
          strokeWidth="2.5"
          fill="none"
        />
        <circle
          cx="12"
          cy="12"
          r={radius}
          className={cn('transition-all duration-500 ease-out', colorClass)}
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className={cn('text-xs font-black tabular-nums tracking-tight min-w-[2.25rem] text-right', badgeColor)}>
        {percentage}%
      </span>
    </div>
  );
};

export const DashboardSubjectPerformanceTable = ({
  performance,
  onNavigate,
  className,
}: DashboardSubjectPerformanceTableProps) => {
  const totalMinutesAll = performance.reduce((acc, curr) => acc + curr.totalMinutes, 0);
  const totalCorrect = performance.reduce((acc, curr) => acc + curr.correct, 0);
  const totalIncorrect = performance.reduce((acc, curr) => acc + curr.incorrect, 0);
  const totalSkipped = performance.reduce((acc, curr) => acc + curr.skipped, 0);
  const totalQuestions = totalCorrect + totalIncorrect + totalSkipped;

  return (
    <section
      aria-labelledby="dashboard-subject-performance-heading"
      className={cn(
        'relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200',
        // Modo Dia: Apple Minimal
        'bg-white border-border/70 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]',
        // Modo Noite: Grafite Moderno com micro-luz zenital
        'dark:bg-[#18191E] dark:border-white/[0.08] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_24px_-6px_rgba(0,0,0,0.5)]',
        className,
      )}
    >
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 border-b border-border/50 dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary dark:bg-primary/15 shadow-[0_0_10px_rgba(183,251,69,0.15)]">
              <BarChart3 className="size-3.5" aria-hidden="true" />
            </span>
            <h2
              id="dashboard-subject-performance-heading"
              className="text-sm font-black tracking-[-0.015em] text-foreground sm:text-base"
            >
              Desempenho por Matéria
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Aproveitamento prático e tempo acumulado nas matérias do ciclo
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate?.('/estatisticas')}
          className="h-8 self-start sm:self-auto gap-1 rounded-full px-3 text-xs font-bold text-primary hover:bg-primary/5 dark:hover:bg-primary/10"
        >
          Ver em Estatísticas
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      {/* Tabela ou Estado Vazio */}
      {performance.length === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center p-6 text-center">
          <span className="grid size-10 place-items-center rounded-2xl bg-muted/40 text-muted-foreground dark:bg-white/[0.05]">
            <BookOpen className="size-5" />
          </span>
          <p className="mt-3 text-xs font-bold text-foreground">Nenhuma matéria no ciclo ativo</p>
          <p className="mt-1 max-w-[34ch] text-[11px] text-muted-foreground">
            Configure seu ciclo de estudos para acompanhar o desempenho por matéria aqui.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3.5 h-7 rounded-lg text-xs"
            onClick={() => onNavigate?.('/meus-editais')}
          >
            Carregar edital
          </Button>
        </div>
      ) : (
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:bg-white/[0.02] dark:border-white/[0.04]">
                <th scope="col" className="py-2.5 pl-4 sm:pl-5 pr-3 whitespace-nowrap">Matéria</th>
                <th scope="col" className="py-2.5 px-2.5 text-left whitespace-nowrap">Ciclo</th>
                <th scope="col" className="py-2.5 px-2.5 text-left whitespace-nowrap">Revisões</th>
                <th scope="col" className="py-2.5 px-2.5 text-right whitespace-nowrap">Questões</th>
                <th scope="col" className="py-2.5 px-2.5 text-right whitespace-nowrap">Tempo</th>
                <th scope="col" className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right whitespace-nowrap">% Acerto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 dark:divide-white/[0.03]">
              {performance.map((item) => {
                const completed = item.completedTopics ?? 0;
                const total = item.totalTopics ?? 0;
                const cyclePercent = total > 0 ? Math.round((completed / total) * 100) : 0;
                const overdue = item.overdueReviewsCount ?? 0;

                return (
                  <tr
                    key={item.subjectId}
                    className="transition-colors hover:bg-muted/30 dark:hover:bg-white/[0.02]"
                  >
                    {/* Nome da Matéria */}
                    <td className="py-3 pl-4 sm:pl-5 pr-3 font-semibold text-foreground whitespace-nowrap">
                      <div className="flex items-center gap-2 max-w-[180px] sm:max-w-[220px]">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: item.color || '#3b82f6' }}
                          aria-hidden="true"
                        />
                        <span className="truncate text-xs font-bold" title={item.subjectName}>
                          {item.subjectName}
                        </span>
                      </div>
                    </td>

                    {/* Progresso no Ciclo */}
                    <td className="py-3 px-2.5 text-left whitespace-nowrap">
                      <div className="flex flex-col gap-1 min-w-[70px]">
                        <span className="text-[11px] font-bold tabular-nums text-foreground">
                          {completed} / {total}
                          <span className="text-[10px] font-normal text-muted-foreground ml-1">tópicos</span>
                        </span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted/60 dark:bg-white/10">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-300"
                            style={{ width: `${cyclePercent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Status de Revisões */}
                    <td className="py-3 px-2.5 text-left whitespace-nowrap">
                      {overdue > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-500/20 dark:text-red-400 border border-red-500/20">
                          <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                          {overdue} {overdue === 1 ? 'atrasada' : 'atrasadas'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-[#b7fb45] border border-emerald-500/20">
                          <Check className="size-2.5" />
                          Em dia
                        </span>
                      )}
                    </td>

                    {/* Questões (Acertos e Erros do Treino) */}
                    <td className="py-3 px-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 text-xs tabular-nums">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400" title="Acertos">
                          {item.correct}
                        </span>
                        <span className="text-muted-foreground/40 font-normal">/</span>
                        <span className="font-bold text-red-500" title="Erros">
                          {item.incorrect}
                        </span>
                        {item.skipped > 0 && (
                          <span className="text-[10px] text-muted-foreground" title="Pulados">
                            ({item.skipped})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Tempo acumulado */}
                    <td className="py-3 px-2.5 text-right font-bold tabular-nums text-foreground/90 whitespace-nowrap">
                      {formatMinutes(item.totalMinutes)}
                    </td>

                    {/* % de Acerto em Anel */}
                    <td className="py-3 pr-4 sm:pr-5 pl-2.5 text-right whitespace-nowrap">
                      <AccuracyRing percentage={item.accuracyPercentage} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Rodapé com totais consolidados */}
      {performance.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 bg-muted/10 px-4 py-3 text-[11px] font-semibold text-muted-foreground dark:border-white/[0.06] dark:bg-white/[0.01] sm:px-5">
          <div className="flex items-center gap-3">
            <span>
              <strong className="text-foreground">{performance.length}</strong> {performance.length === 1 ? 'matéria' : 'matérias'}
            </span>
            <span>·</span>
            <span>
              <strong className="text-foreground">{totalQuestions}</strong> {totalQuestions === 1 ? 'questão' : 'questões respondidas'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Tempo acumulado:</span>
            <strong className="tabular-nums text-foreground">{formatMinutes(totalMinutesAll)}</strong>
          </div>
        </div>
      ) : null}
    </section>
  );
};
