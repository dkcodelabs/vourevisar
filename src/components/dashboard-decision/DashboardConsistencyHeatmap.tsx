import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Flame, Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { DashboardHeatmapDay } from '@/types/dashboardDecision';

export interface DashboardConsistencyHeatmapProps {
  heatmap: {
    days: DashboardHeatmapDay[];
    currentStreak: number;
    totalActiveDays: number;
  };
  className?: string;
}

const formatTooltipDate = (dateStr: string): string => {
  try {
    const d = parseISO(dateStr);
    const formatted = format(d, "EEEE, dd 'de' MMMM", { locale: ptBR });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return dateStr;
  }
};

const formatTooltipMinutes = (minutes: number): string => {
  if (!minutes || minutes <= 0) return 'Nenhum tempo registrado';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min de estudo`;
  return `${h}h ${m.toString().padStart(2, '0')}min de estudo`;
};

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export const DashboardConsistencyHeatmap = ({
  heatmap,
  className,
}: DashboardConsistencyHeatmapProps) => {
  const { days, currentStreak, totalActiveDays } = heatmap;

  // Organizar dias em colunas de semanas (7 dias por coluna)
  const { weeks, monthHeaders } = useMemo(() => {
    if (!days || days.length === 0) {
      return { weeks: [], monthHeaders: [] };
    }

    const cols: DashboardHeatmapDay[][] = [];
    const numWeeks = Math.ceil(days.length / 7);

    for (let i = 0; i < numWeeks; i++) {
      cols.push(days.slice(i * 7, (i + 1) * 7));
    }

    // Identificar rótulo do mês no topo da semana evitando sobreposição
    let lastMonth = '';
    let lastHeaderWeek = -3;
    const headers: { weekIndex: number; label: string }[] = [];

    cols.forEach((week, index) => {
      if (week.length > 0) {
        try {
          // Usar quinta-feira da semana (índice 3 ou meio) para definir o mês preponderante da semana
          const representativeDateStr = week[Math.min(3, week.length - 1)]?.date || week[0].date;
          const repDate = parseISO(representativeDateStr);
          const monthName = format(repDate, 'MMM', { locale: ptBR });
          if (monthName !== lastMonth && (index - lastHeaderWeek >= 2 || index === 0)) {
            headers.push({ weekIndex: index, label: monthName.replace('.', '') });
            lastMonth = monthName;
            lastHeaderWeek = index;
          }
        } catch {
          // ignore parsing error
        }
      }
    });

    return { weeks: cols, monthHeaders: headers };
  }, [days]);

  return (
    <section
      aria-labelledby="dashboard-consistency-heading"
      className={cn(
        'relative flex flex-col overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-200',
        // Modo Dia: Apple Minimal
        'bg-white border-border/70 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]',
        // Modo Noite: Grafite Moderno com micro-luz zenital
        'dark:bg-[#18191E] dark:border-white/[0.08] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_24px_-6px_rgba(0,0,0,0.5)]',
        className,
      )}
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-lg border border-amber-500/25 bg-amber-500/10 dark:bg-amber-500/15 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
              <Sparkles className="size-3.5" aria-hidden="true" />
            </span>
            <h2
              id="dashboard-consistency-heading"
              className="text-sm font-black tracking-[-0.015em] text-foreground sm:text-base"
            >
              Consistência
            </h2>
            <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-bold text-muted-foreground dark:bg-white/[0.06]">
              {totalActiveDays} {totalActiveDays === 1 ? 'dia ativo' : 'dias ativos'}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Histórico diário por semana (Seg a Dom) · 14 semanas até hoje
          </p>
        </div>

        {/* Indicador de Streak */}
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 transition-transform hover:scale-105',
            currentStreak > 0
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
              : 'border-border/60 bg-muted/20 text-muted-foreground dark:border-white/[0.06] dark:bg-white/[0.02]',
          )}
          title={`Sequência atual: ${currentStreak} dias seguidos`}
        >
          <Flame
            className={cn(
              'size-4',
              currentStreak > 0 ? 'text-amber-500 animate-pulse' : 'text-muted-foreground/60',
            )}
          />
          <div className="flex flex-col text-left leading-none">
            <span className="text-xs font-black tabular-nums">{currentStreak}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              {currentStreak === 1 ? 'dia' : 'dias'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid do Heatmap responsivo preenchendo 100% da largura */}
      <div className="mt-4 min-w-0 w-full overflow-x-auto pb-1">
        <TooltipProvider delayDuration={150}>
          <div className="flex flex-col gap-1.5 w-full min-w-[280px]">
            {/* Meses no topo alinhados exatamente com as colunas semanais */}
            <div className="flex items-center gap-1.5 sm:gap-2 w-full text-[10px] font-semibold text-muted-foreground h-4">
              <div className="w-6 sm:w-7 shrink-0" aria-hidden="true" />
              <div className="grid grid-flow-col auto-cols-fr w-full gap-1 sm:gap-1.5">
                {weeks.map((_, index) => {
                  const header = monthHeaders.find((h) => h.weekIndex === index);
                  return (
                    <div key={`month-${index}`} className="relative text-left">
                      {header ? (
                        <span className="absolute left-0 top-0 whitespace-nowrap capitalize text-[10px] font-semibold text-muted-foreground">
                          {header.label}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Matriz 7 linhas (dias da semana) x N colunas (semanas) */}
            <div className="flex items-start gap-1.5 sm:gap-2 w-full">
              {/* Eixo Y com rótulos de dias claros (Seg, Ter, Qua, Qui, Sex, Sáb, Dom) */}
              <div className="flex flex-col gap-1 sm:gap-1.5 w-6 sm:w-7 select-none text-[9px] font-bold text-muted-foreground/75 shrink-0">
                {WEEKDAY_LABELS.map((label, idx) => (
                  <span
                    key={`label-${idx}`}
                    className="h-3.5 sm:h-4 leading-none flex items-center justify-end pr-1"
                  >
                    {label}
                  </span>
                ))}
              </div>

              {/* Colunas de Semanas que se estendem por 100% da largura */}
              <div className="grid grid-flow-col auto-cols-fr gap-1 sm:gap-1.5 w-full">
                {weeks.map((week, wIndex) => (
                  <div key={`col-${wIndex}`} className="flex flex-col gap-1 sm:gap-1.5 items-center">
                    {week.map((day) => {
                      if (day.isFuture) {
                        return (
                          <div
                            key={day.date}
                            aria-hidden="true"
                            className="h-3.5 sm:h-4 w-full max-w-[22px] rounded-[3px] border border-transparent bg-muted/20 dark:bg-white/[0.02] opacity-35"
                          />
                        );
                      }

                      let colorClass = 'bg-muted/40 dark:bg-white/[0.04] border-transparent';
                      if (day.intensity === 'partial') {
                        colorClass = 'bg-amber-300 dark:bg-amber-500/50 border-amber-400/40';
                      } else if (day.intensity === 'completed') {
                        colorClass = 'bg-emerald-400 dark:bg-[#b7fb45]/80 border-emerald-500/30';
                      } else if (day.intensity === 'exceeded') {
                        colorClass = 'bg-emerald-500 dark:bg-[#b7fb45] border-emerald-600/40 dark:shadow-[0_0_8px_rgba(183,251,69,0.35)]';
                      }

                      const todayClass = day.isToday
                        ? day.intensity === 'none'
                          ? 'bg-blue-500/20 border-blue-400/50 ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-1 ring-offset-background z-10'
                          : 'ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-1 ring-offset-background z-10'
                        : '';

                      return (
                        <Tooltip key={day.date}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label={`${day.date}: ${day.studyMinutes}m estudados, ${day.reviewsCount} revisões`}
                              className={cn(
                                'h-3.5 sm:h-4 w-full max-w-[22px] rounded-[3px] border transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary',
                                colorClass,
                                todayClass,
                              )}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="flex flex-col gap-1 py-1.5 px-2.5">
                            <span className="font-bold text-foreground">
                              {formatTooltipDate(day.date)}{day.isToday ? ' · Hoje' : ''}
                            </span>
                            <div className="flex flex-col text-[10px] text-muted-foreground gap-0.5">
                              <span>⏱ {formatTooltipMinutes(day.studyMinutes)}</span>
                              <span>🔄 {day.reviewsCount} {day.reviewsCount === 1 ? 'revisão' : 'revisões'}</span>
                              <span>🎯 {day.practiceCount} {day.practiceCount === 1 ? 'questão' : 'questões'}</span>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TooltipProvider>
      </div>

      {/* Legenda em português claro */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3 text-[10px] text-muted-foreground dark:border-white/[0.05]">
        <span className="text-[10px] font-semibold text-muted-foreground/90">Constância</span>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-[10px] font-medium text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[2px] bg-muted/40 dark:bg-white/[0.04] border border-border/50" />
            <span>Sem estudo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[2px] bg-amber-300 dark:bg-amber-500/50 border border-amber-400/40" />
            <span>Parcial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[2px] bg-emerald-500 dark:bg-[#b7fb45] border border-emerald-600/40" />
            <span>Meta batida</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[2px] bg-blue-500/30 border border-blue-500 ring-1 ring-blue-400" />
            <span>Hoje</span>
          </div>
        </div>
      </div>
    </section>
  );
};
