import { useId } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DashboardDataIssueNotice } from '@/components/dashboard-decision/DashboardDataIssueNotice';
import { cn } from '@/lib/utils';
import { formatPaceRequirement, formatPaceValue, getDashboardRecentPace, getPaceBannerAction } from '@/utils/dashboardDecision';
import type { DashboardNavigate, DashboardPace, DashboardRecentPaceDay } from '@/types/dashboardDecision';

type ExamPacePanelProps = {
  pace: DashboardPace;
  activityDays: DashboardRecentPaceDay[];
  onNavigate: DashboardNavigate;
  isActivityUnavailable?: boolean;
  onRetryActivity?: () => Promise<void>;
};

export function ExamPacePanel({
  pace,
  activityDays,
  onNavigate,
  isActivityUnavailable = false,
  onRetryActivity,
}: ExamPacePanelProps) {
  const titleId = useId();
  const recent = getDashboardRecentPace(activityDays);
  const bannerAction = getPaceBannerAction(pace.state);

  return (
    <section aria-labelledby={titleId} className="min-w-0 p-4 sm:p-5">
      <h3 id={titleId} className="text-sm font-semibold text-foreground">Seu ritmo até a prova</h3>
      <p className="mt-1 text-xs leading-relaxed text-content-muted">
        {pace.state === 'ready'
          ? `${pace.daysRemaining} dias até a prova · metas diárias necessárias`
          : pace.explanation}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <PaceMetric label="Tópicos novos" required={pace.newTopicsPerDay} current={recent.currentTopicsAverage} hasActivity={recent.studiedTopics > 0} isUnavailable={isActivityUnavailable} />
        <PaceMetric label="Revisões" required={pace.reviewsPerDay} current={recent.currentReviewsAverage} hasActivity={recent.completedReviews > 0} isUnavailable={isActivityUnavailable} />
      </div>

      {isActivityUnavailable ? (
        <div className="mt-3">
          <DashboardDataIssueNotice
            title="Não foi possível atualizar a média recente"
            description="As metas até a prova continuam válidas; apenas a comparação com os últimos sete dias está indisponível."
            hasPreviousData={recent.recentDays.length > 0}
            onRetry={onRetryActivity}
          />
        </div>
      ) : null}

      {bannerAction ? (
        <Button variant="outline" className="mt-3 h-auto min-h-11 max-w-full whitespace-normal text-xs" onClick={() => onNavigate(bannerAction.href)}>
          {bannerAction.label}<ArrowRight aria-hidden="true" />
        </Button>
      ) : null}

      <Collapsible className="mt-2">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="group h-auto min-h-11 max-w-full whitespace-normal px-0 text-xs text-primary hover:bg-transparent">
            Detalhes do ritmo
            <ChevronDown aria-hidden="true" className="transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-3 border-t border-border/70 pt-3">
            <div className="space-y-1 text-xs leading-relaxed text-content-muted">
              <h4 className="font-semibold text-foreground">Como o ritmo foi calculado</h4>
              <p>As metas dividem os tópicos e as revisões previstos pelos dias até a prova. A média recente divide os registros pelos dias da janela, incluindo os dias sem atividade.</p>
              <p>Base atual: {pace.unstartedTopics} tópicos e {pace.pendingReviews} revisões{pace.daysRemaining !== null ? ` em ${pace.daysRemaining} dias` : ''}.</p>
              <p>{isActivityUnavailable ? 'A atividade recente não pôde ser atualizada.' : recent.recentDays.length > 0 ? `Janela recente: ${recent.recentDays.length} dias. Médias arredondadas para uma casa decimal.` : 'Ainda não há registros na janela recente.'}</p>
            </div>

            <Button variant="outline" className="h-auto min-h-11 max-w-full whitespace-normal text-xs" onClick={() => onNavigate('/ciclo-estudos')}>
              Abrir Ciclo de Estudos<ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Button variant="ghost" className="mt-1 h-auto min-h-11 max-w-full whitespace-normal px-0 text-xs text-primary hover:bg-transparent" onClick={() => onNavigate('/estatisticas')}>
        Abrir Evolução completa<ArrowRight aria-hidden="true" />
      </Button>
    </section>
  );
}

function PaceMetric({ label, required, current, hasActivity, isUnavailable }: { label: string; required: number | null; current: number; hasActivity: boolean; isUnavailable: boolean }) {
  const display = formatPaceRequirement(required);
  const isOnPace = required !== null && hasActivity && current >= required;

  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-surface/45 p-3">
      <p className="text-xs font-medium text-content-muted">{label}</p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
        <strong className="text-2xl font-semibold tabular-nums leading-none text-foreground">{display.value}</strong>
        {display.cadence ? <span className="text-[11px] text-content-muted">{display.cadence}</span> : null}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-content-muted">
        {isUnavailable ? 'Média recente indisponível' : hasActivity ? `Média recente: ${formatPaceValue(current)}` : 'Ainda sem histórico recente'}
      </p>
      {!isUnavailable && required !== null && hasActivity ? (
        <p className={cn('mt-1 text-[11px] font-medium leading-relaxed', isOnPace ? 'text-foreground' : 'text-content-muted')}>
          {isOnPace ? <span aria-hidden="true" className="mr-1 inline-block size-1.5 rounded-full bg-success" /> : null}
          {isOnPace ? 'Seu ritmo atual já acompanha a meta' : 'Sua média ainda está abaixo da meta'}
        </p>
      ) : null}
    </div>
  );
}
