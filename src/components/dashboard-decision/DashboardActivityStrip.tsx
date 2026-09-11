import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardDataIssueNotice } from '@/components/dashboard-decision/DashboardDataIssueNotice';
import { cn } from '@/lib/utils';
import type { DashboardRecentPaceDay, DashboardNavigate } from '@/types/dashboardDecision';

export const DashboardActivityStrip = ({ activityDays, onNavigate, isUnavailable, onRetry, className }: { activityDays: DashboardRecentPaceDay[]; onNavigate: DashboardNavigate; isUnavailable: boolean; onRetry?: () => Promise<void>; className?: string }) => {
  const maximum = Math.max(1, ...activityDays.map((day) => day.studiedCount + day.reviewedCount));
  const total = activityDays.reduce((sum, day) => sum + day.studiedCount + day.reviewedCount, 0);

  return (
    <section aria-labelledby="dashboard-activity-title" className={cn('rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.06)] dark:border-white/[0.06] dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.4)]', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="dashboard-activity-title" className="text-sm font-black tracking-[-0.015em] text-foreground sm:text-base">Atividade recente</h2>
          <p className="mt-1 text-xs text-muted-foreground">{total ? `${total} registros de estudo e revisão nos últimos 7 dias` : 'Seu ritmo dos últimos 7 dias aparecerá aqui'}</p>
        </div>
        <Button variant="ghost" size="sm" className="min-h-9 shrink-0 gap-1 rounded-full px-3 text-xs font-bold text-primary hover:bg-primary/5" onClick={() => onNavigate('/estatisticas')}>
          Ver evolução
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
      {isUnavailable ? (
        <div className="mt-4">
          <DashboardDataIssueNotice title="Atividade indisponível" description="Não foi possível atualizar os últimos 7 dias." hasPreviousData={activityDays.length > 0} onRetry={onRetry} />
        </div>
      ) : (
        <div className="mt-4">
          <div className="grid h-28 grid-cols-7 items-end gap-2 px-1" role="img" aria-label={`Atividade dos últimos sete dias: ${total} registros`}>
            {activityDays.map((day) => {
              const studiedHeight = Math.max(4, Math.round((day.studiedCount / maximum) * 76));
              const reviewedHeight = Math.max(4, Math.round((day.reviewedCount / maximum) * 76));
              const hasStudied = day.studiedCount > 0;
              const hasReviewed = day.reviewedCount > 0;

              return (
                <div key={day.date} className="flex h-full min-w-0 flex-col items-center justify-end gap-1.5" title={`${day.studiedCount} estudos e ${day.reviewedCount} revisões`}>
                  <div className="flex h-[80px] w-full max-w-9 items-end justify-center gap-1">
                    <span
                      className={cn(
                        'w-2.5 rounded-t-md transition-all duration-300',
                        hasStudied ? 'bg-gradient-to-t from-blue-600 to-indigo-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'bg-muted/40'
                      )}
                      style={{ height: `${hasStudied ? studiedHeight : 4}px` }}
                    />
                    <span
                      className={cn(
                        'w-2.5 rounded-t-md transition-all duration-300',
                        hasReviewed ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-muted/40'
                      )}
                      style={{ height: `${hasReviewed ? reviewedHeight : 4}px` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{format(parseISO(day.date), 'EEE', { locale: ptBR }).slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3.5 flex items-center gap-4 border-t border-border/50 pt-3 text-[11px] font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-indigo-500 shadow-sm" />Estudo</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-500 shadow-sm" />Revisão</span>
          </div>
        </div>
      )}
    </section>
  );
};
