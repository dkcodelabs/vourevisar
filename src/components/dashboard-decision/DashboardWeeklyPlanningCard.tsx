import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, Calendar, Check, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { DashboardWeeklyPlanning } from '@/types/dashboardDecision';

export interface DashboardWeeklyPlanningCardProps {
  planning: DashboardWeeklyPlanning;
  onUpdateWeeklyGoal?: (goalHours: number) => Promise<void>;
  isUpdatingGoal?: boolean;
  onNavigate?: (href: string) => void;
  className?: string;
}

const formatMinutesToHoursAndMinutes = (totalMinutes: number): string => {
  if (!totalMinutes || totalMinutes <= 0) return '0h 00m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
};

export const DashboardWeeklyPlanningCard = ({
  planning,
  onUpdateWeeklyGoal,
  isUpdatingGoal = false,
  onNavigate,
  className,
}: DashboardWeeklyPlanningCardProps) => {
  const { currentWeekMinutes, weeklyGoalHours, days } = planning;

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(String(weeklyGoalHours));

  useEffect(() => {
    if (!isEditingGoal) {
      setGoalDraft(String(weeklyGoalHours));
    }
  }, [weeklyGoalHours, isEditingGoal]);

  const parsedGoal = parseInt(goalDraft, 10);
  const isGoalValid = !isNaN(parsedGoal) && parsedGoal >= 1 && parsedGoal <= 168;

  const goalMinutes = Math.max(1, weeklyGoalHours * 60);
  const progressPercent = Math.min(100, Math.round((currentWeekMinutes / goalMinutes) * 100));

  const maxDayReviews = Math.max(1, ...days.map((d) => d.reviewCount));
  const totalWeeklyReviews = days.reduce((acc, d) => acc + d.reviewCount, 0);

  const handleSaveGoal = async () => {
    if (!isGoalValid) return;
    if (onUpdateWeeklyGoal) {
      await onUpdateWeeklyGoal(parsedGoal);
    }
    setIsEditingGoal(false);
  };

  const todayDate = days.find((d) => d.isToday)?.date || format(new Date(), 'yyyy-MM-dd');

  const handleDayClick = (day: (typeof days)[number]) => {
    if (!onNavigate) return;
    if (day.isToday || day.hasOverdue) {
      onNavigate('/revisoes?tab=today');
    } else if (day.isFuture ?? (day.date > todayDate)) {
      onNavigate('/revisoes?tab=future');
    } else {
      onNavigate('/revisoes');
    }
  };

  return (
    <section
      aria-labelledby="dashboard-weekly-planning-heading"
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
            <span className="grid size-6 place-items-center rounded-lg border border-indigo-500/25 bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
              <Calendar className="size-3.5" aria-hidden="true" />
            </span>
            <h2
              id="dashboard-weekly-planning-heading"
              className="text-sm font-black tracking-[-0.015em] text-foreground sm:text-base"
            >
              Planejamento
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Meta semanal de estudo e revisões distribuídas nos 7 dias
          </p>
        </div>

        {/* Popover de Edição da Meta Semanal */}
        {onUpdateWeeklyGoal ? (
          <Popover open={isEditingGoal} onOpenChange={setIsEditingGoal}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 rounded-lg px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                aria-label="Editar meta semanal"
              >
                <Pencil className="size-3" />
                <span className="hidden sm:inline">Meta</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-3">
              <div className="flex flex-col gap-2">
                <label htmlFor="weekly-goal-input" className="text-xs font-bold text-foreground">
                  Meta semanal de horas
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="weekly-goal-input"
                    type="number"
                    min={1}
                    max={168}
                    value={goalDraft}
                    onChange={(e) => setGoalDraft(e.target.value)}
                    className="h-8 text-xs"
                    disabled={isUpdatingGoal}
                  />
                  <span className="text-xs text-muted-foreground">horas</span>
                </div>
                <Button
                  size="sm"
                  className="h-7 mt-1 gap-1 text-xs font-bold"
                  onClick={() => void handleSaveGoal()}
                  disabled={isUpdatingGoal}
                >
                  {isUpdatingGoal ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Check className="size-3" />
                  )}
                  Salvar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>

      {/* Barra de Progresso Semanal (Horas Estudadas vs Meta) */}
      <div className="mt-4 rounded-xl border border-border/50 bg-muted/20 p-3 dark:border-white/[0.05] dark:bg-white/[0.02]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-foreground tabular-nums">
            {formatMinutesToHoursAndMinutes(currentWeekMinutes)}
            <span className="text-muted-foreground font-normal"> / {weeklyGoalHours}h</span>
          </span>
          <span className="text-[11px] font-black text-primary dark:text-[#b7fb45] tabular-nums">
            {progressPercent}%
          </span>
        </div>

        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted/60 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-[#b7fb45] transition-all duration-500 shadow-[0_0_8px_rgba(183,251,69,0.4)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Gráfico de 7 Barras Verticais Clicáveis (S, T, Q, Q, S, S, D) */}
      <div className="mt-4">
        <div
          className="grid h-28 grid-cols-7 items-end gap-1 px-0.5 sm:gap-1.5 sm:px-1"
          aria-label={`Distribuição semanal: ${totalWeeklyReviews} revisões agendadas`}
        >
          {days.map((day) => {
            const hasReviews = day.reviewCount > 0;
            const barHeight = hasReviews
              ? Math.max(8, Math.round((day.reviewCount / maxDayReviews) * 56))
              : 4;

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => handleDayClick(day)}
                className={cn(
                  'group/day flex h-full min-w-0 flex-col items-center justify-end gap-1 rounded-xl p-1 transition-all duration-200 outline-none',
                  'hover:bg-muted/40 dark:hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer',
                )}
                aria-label={`Ver revisões de ${day.dayLabel}: ${day.reviewCount} ${day.reviewCount === 1 ? 'revisão' : 'revisões'}`}
                title={`${day.dayLabel}: ${day.reviewCount} ${day.reviewCount === 1 ? 'revisão' : 'revisões'}, ${day.studyMinutes}m estudados${day.hasOverdue ? ' (pendências atrasadas)' : ''}`}
              >
                {/* Contagem no topo da barra */}
                <span
                  className={cn(
                    'text-[10px] font-black tabular-nums transition-colors',
                    hasReviews ? 'text-foreground group-hover/day:text-primary dark:group-hover/day:text-[#b7fb45]' : 'text-muted-foreground/35',
                  )}
                >
                  {day.reviewCount}
                </span>

                {/* Barra de volume */}
                <div className="flex h-[56px] w-full max-w-7 items-end justify-center">
                  <span
                    className={cn(
                      'w-full max-w-6 rounded-t-md transition-all duration-300 origin-bottom group-hover/day:scale-y-105 group-hover/day:brightness-110',
                      day.hasOverdue
                        ? 'bg-gradient-to-t from-red-600 via-amber-500 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                        : hasReviews
                          ? 'bg-gradient-to-t from-blue-600 via-indigo-600 to-[#b7fb45] dark:from-indigo-600 dark:via-purple-600 dark:to-cyan-400 shadow-[0_0_10px_rgba(99,102,241,0.35)]'
                          : 'bg-muted/40 dark:bg-white/[0.04]',
                    )}
                    style={{ height: `${barHeight}px` }}
                  />
                </div>

                {/* Rótulo do dia: Hoje ou Letra (S, T, Q, Q, S, S, D) */}
                <div className="mt-1 flex h-4 items-center justify-center">
                  {day.isToday ? (
                    <span className="rounded-full bg-primary/20 px-1 py-0.2 text-[8px] font-black uppercase text-primary dark:text-[#b7fb45] shadow-sm">
                      Hoje
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-muted-foreground group-hover/day:text-foreground transition-colors">
                      {day.shortDay}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rodapé com atalho para revisões */}
      <div className="mt-3.5 flex items-center justify-between border-t border-border/40 pt-3 text-[11px] font-semibold text-muted-foreground dark:border-white/[0.05]">
        <span>
          <strong className="text-foreground">{totalWeeklyReviews}</strong>{' '}
          {totalWeeklyReviews === 1 ? 'revisão agendada' : 'revisões agendadas'}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate?.('/revisoes')}
          className="h-6 gap-1 p-0 text-xs font-bold text-primary hover:bg-transparent hover:underline"
        >
          Ver todas
          <ArrowUpRight className="size-3" />
        </Button>
      </div>
    </section>
  );
};
