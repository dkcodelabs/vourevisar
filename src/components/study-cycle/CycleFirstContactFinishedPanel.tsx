import {
  ArrowRight,
  BookCheck,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';

import type { StudyCycleTransitionSummary } from '@/utils/studyCycleTransitionSummary';

type CycleFirstContactFinishedPanelProps = {
  cycleRoundComplete?: boolean;
  formatStudyMinutes: (minutes: number) => string;
  onNavigate: (to: string) => void;
  onStartNextCycle?: () => void;
  summary: StudyCycleTransitionSummary;
  variant?: 'full' | 'compact';
};

export function CycleFirstContactFinishedPanel({
  cycleRoundComplete = false,
  formatStudyMinutes,
  onNavigate,
  onStartNextCycle,
  summary,
  variant = 'compact',
}: CycleFirstContactFinishedPanelProps) {
  const action = summary.primaryAction;
  const reviewCounts = summary.reviewCounts;
  const topSubject = summary.topSubjectByStudyMinutes;
  const lowestSubject = summary.lowestSubjectByStudyMinutes;
  const shouldOfferNextCycle = cycleRoundComplete && action.kind === 'continue_cycle';

  let eyebrow = 'PRIMEIRO CONTATO FINALIZADO';
  let title = 'Todos os tópicos do edital foram iniciados!';
  let description =
    'Todos os tópicos ativos do edital já foram iniciados. A fila de avanço cumpriu seu papel; daqui em diante o maior ganho está na consolidação e retenção pelas revisões programadas.';
  let primaryLabel = action.label;

  if (action.kind === 'edital_completed') {
    eyebrow = 'EDITAL CONCLUÍDO';
    title = 'Parabéns! Programa de revisões concluído';
    description = 'Todos os tópicos ativos completaram o ciclo completo de revisões programadas.';
    primaryLabel = 'Ver desempenho';
  } else if (shouldOfferNextCycle) {
    eyebrow = 'RODADA CONCLUÍDA';
    title = 'Rodada finalizada com sucesso!';
    description =
      'Você cumpriu todas as matérias da fila nesta rodada. Inicie o próximo ciclo para continuar avançando nos tópicos restantes do edital.';
    primaryLabel = 'Iniciar próximo ciclo';
  }

  const urgentReviewsCount = reviewCounts.overdue + reviewCounts.today;
  const showUrgentReviewAction = shouldOfferNextCycle && urgentReviewsCount > 0;

  return (
    <div
      className={`app-gradient-panel relative w-full overflow-hidden rounded-2xl border app-hairline text-left shadow-sm ${
        variant === 'full' ? 'p-5 sm:p-6' : 'mb-4 p-4 sm:p-5'
      }`}
    >
      <div className="relative z-10 flex flex-col gap-4">
        {/* Header section */}
        <div className="flex items-start gap-3.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-sm">
            {shouldOfferNextCycle ? <Trophy size={20} /> : <CheckCircle2 size={20} className="text-emerald-500" />}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold tracking-wider text-primary uppercase">
              {eyebrow}
            </span>
            <h3 className="mt-0.5 text-base font-bold text-title-section sm:text-lg">
              {title}
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-content-muted sm:text-sm">
              {description}
            </p>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {shouldOfferNextCycle ? (
            <>
              {/* Tile 1: Matérias */}
              <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-surface/50 p-3 backdrop-blur transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wide text-content-muted uppercase">
                    Matérias
                  </span>
                  <BookCheck size={13} className="text-emerald-500" />
                </div>
                <div className="mt-1.5">
                  <p className="text-base font-bold text-foreground tabular-nums sm:text-lg">
                    {summary.totalSubjects} de {summary.totalSubjects}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-emerald-500">
                    100% cumpridas
                  </p>
                </div>
              </div>

              {/* Tile 2: Avanço no edital */}
              <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-surface/50 p-3 backdrop-blur transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wide text-content-muted uppercase">
                    Avanço no edital
                  </span>
                  <Target size={13} className="text-primary" />
                </div>
                <div className="mt-1.5">
                  <p className="text-base font-bold text-foreground tabular-nums sm:text-lg">
                    {summary.startedTopics}/{summary.totalTopics}
                  </p>
                  <p className="mt-0.5 text-[11px] text-content-muted">
                    {summary.unstartedTopics > 0
                      ? `${summary.unstartedTopics} restantes para 1º contato`
                      : 'Todos iniciados'}
                  </p>
                </div>
              </div>

              {/* Tile 3: Tempo registrado */}
              <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-surface/50 p-3 backdrop-blur transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wide text-content-muted uppercase">
                    Tempo registrado
                  </span>
                  <Clock size={13} className="text-indigo-400" />
                </div>
                <div className="mt-1.5">
                  <p className="text-base font-bold text-foreground tabular-nums sm:text-lg">
                    {formatStudyMinutes(summary.totalStudyMinutes)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-content-muted">
                    {summary.averageMinutesPerStartedTopic !== null
                      ? `${summary.averageMinutesPerStartedTopic} min/tópico iniciado`
                      : 'Estudo registrado'}
                  </p>
                </div>
              </div>

              {/* Tile 4: Revisões ativas */}
              <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-surface/50 p-3 backdrop-blur transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wide text-content-muted uppercase">
                    Revisões ativas
                  </span>
                  <CalendarCheck size={13} className="text-amber-500" />
                </div>
                <div className="mt-1.5">
                  <p className="text-base font-bold text-foreground tabular-nums sm:text-lg">
                    {urgentReviewsCount > 0 ? `${urgentReviewsCount} agora` : '0 pendentes hoje'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-content-muted">
                    {reviewCounts.overdue > 0
                      ? `${reviewCounts.overdue} atrasadas, ${reviewCounts.today} hoje`
                      : `${reviewCounts.future} futuras programadas`}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Tópicos no edital */}
              <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-surface/50 p-3 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wide text-content-muted uppercase">
                    Tópicos no edital
                  </span>
                  <Target size={13} className="text-emerald-500" />
                </div>
                <div className="mt-1.5">
                  <p className="text-base font-bold text-foreground tabular-nums sm:text-lg">
                    {summary.startedTopics}/{summary.totalTopics}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-emerald-500">
                    100% iniciados
                  </p>
                </div>
              </div>

              {/* Revisões agora */}
              <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-surface/50 p-3 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wide text-content-muted uppercase">
                    Revisões agora
                  </span>
                  <CalendarCheck size={13} className="text-amber-500" />
                </div>
                <div className="mt-1.5">
                  <p className="text-base font-bold text-foreground tabular-nums sm:text-lg">
                    {reviewCounts.overdue + reviewCounts.today}
                  </p>
                  <p className="mt-0.5 text-[11px] text-content-muted">
                    {reviewCounts.overdue} atrasadas, {reviewCounts.today} hoje
                  </p>
                </div>
              </div>

              {/* Tempo total */}
              <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-surface/50 p-3 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wide text-content-muted uppercase">
                    Tempo total
                  </span>
                  <Clock size={13} className="text-indigo-400" />
                </div>
                <div className="mt-1.5">
                  <p className="text-base font-bold text-foreground tabular-nums sm:text-lg">
                    {formatStudyMinutes(summary.totalStudyMinutes)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-content-muted">
                    {summary.averageMinutesPerStartedTopic !== null
                      ? `${summary.averageMinutesPerStartedTopic} min/tópico`
                      : 'Tempo registrado'}
                  </p>
                </div>
              </div>

              {/* Revisões futuras */}
              <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-surface/50 p-3 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wide text-content-muted uppercase">
                    Revisões futuras
                  </span>
                  <CalendarClock size={13} className="text-primary" />
                </div>
                <div className="mt-1.5">
                  <p className="text-base font-bold text-foreground tabular-nums sm:text-lg">
                    {reviewCounts.future}
                  </p>
                  <p className="mt-0.5 text-[11px] text-content-muted">
                    {reviewCounts.unscheduled > 0
                      ? `${reviewCounts.unscheduled} sem agenda`
                      : 'Programadas'}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Highlight insight row */}
        {topSubject && topSubject.minutes > 0 && (
          <div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-surface/30 px-3.5 py-2 text-xs sm:text-sm text-content-muted">
            <div className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
              <Sparkles size={12} />
              <span>DESTAQUE</span>
            </div>
            <p className="min-w-0 flex-1 leading-normal text-content-muted">
              {lowestSubject && lowestSubject.minutes > 0 ? (
                <>
                  <strong className="font-bold text-foreground">{topSubject.subjectName}</strong> teve a maior dedicação da rodada com{' '}
                  <span className="font-bold text-primary">{formatStudyMinutes(topSubject.minutes)}</span>, enquanto{' '}
                  <strong className="font-bold text-foreground">{lowestSubject.subjectName}</strong> teve a menor com{' '}
                  <span className="font-bold text-amber-500/90">{formatStudyMinutes(lowestSubject.minutes)}</span>.
                </>
              ) : (
                <>
                  <strong className="font-bold text-foreground">{topSubject.subjectName}</strong> teve a maior dedicação da rodada com{' '}
                  <span className="font-bold text-primary">{formatStudyMinutes(topSubject.minutes)}</span> de estudo registrado.
                </>
              )}
            </p>
          </div>
        )}

        {/* Action bar (Right-aligned) */}
        <div className="flex flex-col-reverse gap-2.5 border-t border-border/30 pt-3.5 sm:flex-row sm:items-center sm:justify-end">
          {showUrgentReviewAction && (
            <button
              type="button"
              onClick={() => onNavigate(reviewCounts.overdue > 0 ? '/revisoes?tab=atrasadas' : '/revisoes?tab=hoje')}
              className="app-control inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-surface/50 px-4 text-xs font-semibold text-content-muted hover:border-border hover:bg-surface hover:text-foreground"
            >
              <CalendarClock size={14} />
              <span>
                {reviewCounts.overdue > 0
                  ? `Revisar atrasadas (${reviewCounts.overdue})`
                  : `Revisar hoje (${reviewCounts.today})`}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (shouldOfferNextCycle && onStartNextCycle) {
                onStartNextCycle();
                return;
              }
              onNavigate(action.to);
            }}
            className="app-primary-button inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-5 text-xs font-bold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <span>{primaryLabel}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
