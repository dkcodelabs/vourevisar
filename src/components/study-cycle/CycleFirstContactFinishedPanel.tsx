import { ArrowRight, BookOpen, CheckCircle2, Gauge } from 'lucide-react';

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
  const shouldOfferNextCycle = cycleRoundComplete && action.kind === 'continue_cycle';
  const title = shouldOfferNextCycle
    ? 'Primeiro contato encerrado. Próxima rodada pronta'
    : 'Agora a prioridade é revisão, não novo ciclo';
  const description = shouldOfferNextCycle
    ? 'Não há tópicos novos pendentes nesta rodada. O próximo ciclo libera uma nova passagem pela fila sem confundir conteúdo iniciado com matéria concluída.'
    : 'Todos os tópicos ativos do edital já foram iniciados. A fila de avanço cumpriu seu papel; daqui em diante o risco está em atrasar ou perder as revisões programadas.';
  const primaryLabel = shouldOfferNextCycle ? 'Novo ciclo' : action.label;

  return (
    <div className={`app-gradient-panel w-full rounded-2xl text-left ${variant === 'full' ? 'max-w-3xl p-5 sm:p-6' : 'mb-4 p-4'}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary">
              <CheckCircle2 size={21} />
            </div>
            <div className="min-w-0">
              <p className="app-type-eyebrow text-primary">
                {shouldOfferNextCycle ? 'Primeiro contato encerrado' : 'Primeiro contato finalizado'}
              </p>
              <h3 className="mt-1 text-lg font-black text-title-section">
                {title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-content-muted">
                {description}
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border app-hairline bg-surface/55 px-3 py-2 backdrop-blur">
              <p className="app-type-eyebrow text-content-muted">Sem tópico novo</p>
              <p className="mt-1 text-lg font-black text-title-card tabular-nums">
                {summary.firstContactClosedSubjects}/{summary.totalSubjects}
              </p>
            </div>
            <div className="rounded-xl border app-hairline bg-surface/55 px-3 py-2 backdrop-blur">
              <p className="app-type-eyebrow text-content-muted">Tópicos iniciados</p>
              <p className="mt-1 text-lg font-black text-title-card tabular-nums">
                {summary.startedTopics}/{summary.totalTopics}
              </p>
            </div>
            <div className="rounded-xl border app-hairline bg-surface/55 px-3 py-2 backdrop-blur">
              <p className="app-type-eyebrow text-content-muted">Revisões agora</p>
              <p className="mt-1 text-lg font-black text-title-card tabular-nums">
                {reviewCounts.overdue + reviewCounts.today}
              </p>
              <p className="app-type-caption mt-0.5 text-content-muted">
                {reviewCounts.overdue} atrasadas, {reviewCounts.today} hoje
              </p>
            </div>
            <div className="rounded-xl border app-hairline bg-surface/55 px-3 py-2 backdrop-blur">
              <p className="app-type-eyebrow text-content-muted">Tempo registrado</p>
              <p className="mt-1 text-lg font-black text-title-card tabular-nums">
                {formatStudyMinutes(summary.totalStudyMinutes)}
              </p>
              {summary.averageMinutesPerStartedTopic !== null && (
                <p className="app-type-caption mt-0.5 text-content-muted">
                  {summary.averageMinutesPerStartedTopic} min/tópico
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-3">
              <div className="mb-1 flex items-center gap-2 text-primary">
                <BookOpen size={14} />
                <p className="app-type-eyebrow">{shouldOfferNextCycle ? 'Resumo do ciclo' : 'Próxima ação'}</p>
              </div>
              <p className="app-type-body-small text-title-card">
                {shouldOfferNextCycle
                  ? `${summary.firstContactClosedSubjects}/${summary.totalSubjects} matérias estão sem tópicos novos. ${summary.startedTopics}/${summary.totalTopics} tópicos já têm primeiro contato.`
                  : action.description}
              </p>
            </div>
            <div className="rounded-xl border app-hairline bg-surface/45 p-3">
              <div className="mb-1 flex items-center gap-2 text-content-muted">
                <Gauge size={14} />
                <p className="app-type-eyebrow">Resumo de esforço</p>
              </div>
              <p className="app-type-body-small text-title-card">
                {topSubject
                  ? `${topSubject.subjectName} concentrou ${formatStudyMinutes(topSubject.minutes)} de estudo registrado.`
                  : 'Ainda não há tempo de estudo suficiente registrado para destacar uma matéria.'}
              </p>
              <p className="app-type-caption mt-1 text-content-muted">
                Futuras: {reviewCounts.future}. Sem agenda: {reviewCounts.unscheduled}.
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 lg:w-44">
          <button
            type="button"
            onClick={() => {
              if (shouldOfferNextCycle && onStartNextCycle) {
                onStartNextCycle();
                return;
              }
              onNavigate(action.to);
            }}
            className="app-primary-button justify-center gap-2 px-4 py-2.5"
          >
            {primaryLabel}
            <ArrowRight size={14} />
          </button>
          {action.kind !== 'future_reviews' && reviewCounts.future > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('/revisoes?tab=futuras')}
              className="app-control justify-center gap-2 px-3 py-2"
            >
              Próximas revisões
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
