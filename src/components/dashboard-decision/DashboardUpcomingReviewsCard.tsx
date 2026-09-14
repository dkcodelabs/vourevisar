import { ArrowUpRight, CalendarClock, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getUpcomingReviewsInsight } from '@/utils/upcomingReviews';
import type { DashboardUpcomingReviews, DashboardNavigate } from '@/types/dashboardDecision';

export interface DashboardUpcomingReviewsCardProps {
  upcoming: DashboardUpcomingReviews;
  onNavigate: DashboardNavigate;
  className?: string;
}

export const DashboardUpcomingReviewsCard = ({
  upcoming,
  onNavigate,
  className,
}: DashboardUpcomingReviewsCardProps) => {
  const maxDayCount = Math.max(1, ...upcoming.days.map((day) => day.reviewCount));
  const insight = getUpcomingReviewsInsight(upcoming);

  return (
    <section
      aria-labelledby="dashboard-upcoming-reviews-title"
      className={cn(
        'dashboard-upcoming-reviews-card rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.06)] dark:border-white/[0.10] dark:bg-gradient-to-b dark:from-[#1c1e26]/95 dark:via-[#181a22]/95 dark:to-[#13141b]/95 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_-10px_rgba(0,0,0,0.6)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-lg border border-purple-500/30 bg-purple-500/15 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.25)]">
              <CalendarClock className="size-3.5" aria-hidden="true" />
            </span>
            <h2
              id="dashboard-upcoming-reviews-title"
              className="text-sm font-black tracking-[-0.015em] text-foreground sm:text-base"
            >
              Previsão de revisões
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {upcoming.totalInWindow > 0
              ? `${upcoming.totalInWindow} ${upcoming.totalInWindow === 1 ? 'revisão agendada' : 'revisões agendadas'} para os próximos 7 dias`
              : 'Nenhuma revisão agendada para os próximos 7 dias'}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="min-h-9 shrink-0 gap-1 rounded-full px-3 text-xs font-bold text-primary hover:bg-primary/5"
          onClick={() => onNavigate('/revisoes')}
          aria-label="Ver todas as revisões"
        >
          Ver todas
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      {/* Grid de 7 Colunas (Hoje -> D+6) */}
      <div className="mt-4">
        <div
          className="grid h-32 grid-cols-7 items-end gap-1.5 px-0.5 sm:gap-2 sm:px-1"
          role="img"
          aria-label={`Previsão dos próximos sete dias: ${upcoming.totalInWindow} revisões`}
        >
          {upcoming.days.map((day) => {
            const hasReviews = day.reviewCount > 0;
            const barHeight = hasReviews
              ? Math.max(8, Math.round((day.reviewCount / maxDayCount) * 72))
              : 4;

            const isOverdueDay = day.isToday && typeof day.overdueCount === 'number' && day.overdueCount > 0;

            return (
              <div
                key={day.date}
                className="flex h-full min-w-0 flex-col items-center justify-end gap-1"
                title={`${day.dayLabel}: ${day.reviewCount} ${day.reviewCount === 1 ? 'revisão' : 'revisões'}${isOverdueDay ? ` (${day.overdueCount} atrasadas)` : ''}`}
              >
                {/* Contagem no topo da barra */}
                <span
                  className={cn(
                    'text-[10px] font-black tabular-nums transition-colors',
                    hasReviews ? 'text-foreground' : 'text-muted-foreground/40',
                  )}
                >
                  {day.reviewCount}
                </span>

                {/* Barra de volume */}
                <div className="flex h-[72px] w-full max-w-8 items-end justify-center">
                  <span
                    className={cn(
                      'w-full max-w-7 rounded-t-md transition-all duration-300',
                      isOverdueDay
                        ? 'bg-gradient-to-t from-red-600 via-amber-500 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                        : hasReviews
                          ? 'bg-gradient-to-t from-purple-600 via-indigo-600 to-cyan-400 shadow-[0_0_10px_rgba(147,51,234,0.35)]'
                          : 'bg-muted/40 dark:bg-white/[0.05]',
                    )}
                    style={{ height: `${barHeight}px` }}
                  />
                </div>

                {/* Rótulo do dia */}
                <div className="mt-1 flex h-5 items-center justify-center">
                  {day.isToday ? (
                    <span className="rounded-full border border-purple-500/30 bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-purple-400 shadow-sm">
                      Hoje
                    </span>
                  ) : (
                    <span className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {day.dayOfWeek}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé com inteligência e insight acionável */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3 text-[11px] font-medium text-muted-foreground">
          <div className="flex items-center gap-1.5">
            {insight.tone === 'warning' ? (
              <AlertCircle className="size-3.5 shrink-0 text-amber-500" aria-hidden="true" />
            ) : insight.tone === 'info' ? (
              <Sparkles className="size-3.5 shrink-0 text-blue-400" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
            )}
            <span className="font-semibold text-foreground/90">{insight.message}</span>
          </div>

          {upcoming.totalBeyondWindow > 0 ? (
            <span className="shrink-0 rounded-full bg-secondary/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              +{upcoming.totalBeyondWindow} no horizonte futuro
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
};
