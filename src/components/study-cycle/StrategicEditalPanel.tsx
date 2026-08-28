import type { RefObject, ReactNode } from 'react';
import {
  AlertCircle,
  BarChart2,
  ChevronRight,
  Gauge,
  ListTodo,
  Loader2,
  MoveUp,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';

import type { Subject, UserCycle } from '@/types';
import type { StudyCycleAlert } from '@/utils/studyCycleAlerts';
import type { StudyCycleEventInsight } from '@/utils/studyCycleEventInsights';
import type { StudyCycleQueueSuggestion } from '@/utils/studyCycleQueueSuggestion';
import type { StudyCycleTransitionSummary } from '@/utils/studyCycleTransitionSummary';

type StudyCycleMaturityPhase = 'cold_start' | 'started' | 'active' | 'historical';

type StrategicEdital = {
  id: string;
  name: string;
  subject_ids: string[];
  organ?: string;
  position?: string;
};

type StrategicPanelStats = {
  coveragePercentage: number;
  startedSubjectsCount?: number;
  totalSubjects?: number;
  highestIncidenceTopic: {
    topicName: string;
    subjectName: string;
    volume: number;
  } | null;
  highestIncidenceSubject: {
    subjectName: string;
    totalVolume: number;
    analyzedTopicsCount: number;
  } | null;
  highestPendingWeightSubject: {
    subject: Subject;
    effectiveWeight: {
      value: number;
      label: string;
      source: string;
    };
    percentage: number | null;
  } | null;
};

type CycleMaturity = {
  phase: StudyCycleMaturityPhase;
  label: string;
  description: string;
  cycleNumber: number;
  hasSavedCycleHistory: boolean;
};

type CycleVisualStats = {
  daysToFinish: number | null;
};

type StrategicEditalPanelProps = {
  cycleDisplayName: string;
  cycleEventInsights: StudyCycleEventInsight[];
  cycleMaturity: CycleMaturity;
  cycleTransitionSummary: StudyCycleTransitionSummary;
  cycleVisualStats: CycleVisualStats;
  editaisNoCiclo: StrategicEdital[];
  getUnifiedSubjectName: (subjectId: string, fallbackName: string) => string;
  handleApplySuggestedQueueOrder: (suggestedOrder: string[]) => void;
  handleStrategicAlertAction: (alert: StudyCycleAlert) => void;
  isResettingCycle: boolean;
  localSubjects: Subject[];
  queueSuggestion: StudyCycleQueueSuggestion | null;
  renderCycleTooltip: (content: ReactNode, trigger: ReactNode) => ReactNode;
  setResetCycleConfirmOpen: (open: boolean) => void;
  strategicAlerts: StudyCycleAlert[];
  strategicPanelRef: RefObject<HTMLElement>;
  strategicPanelStats: StrategicPanelStats;
  userCycle: UserCycle | null;
};

const formatDerivedWeightPercentage = (value?: number | null) =>
  typeof value === 'number' && Number.isFinite(value)
    ? `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% entre pesos informados`
    : null;

const alertStyles: Record<StudyCycleAlert['severity'], { card: string; icon: string; label: string }> = {
  critical: {
    card: 'border-destructive/25 bg-destructive/10 text-destructive',
    icon: 'bg-destructive/15 text-destructive',
    label: 'Crítico',
  },
  warning: {
    card: 'border-warning/25 bg-warning/10 text-warning',
    icon: 'bg-warning/15 text-warning',
    label: 'Atenção',
  },
  info: {
    card: 'border-info/20 bg-info/10 text-info',
    icon: 'bg-info/15 text-info',
    label: 'Sinal',
  },
};

export function StrategicEditalPanel({
  cycleDisplayName,
  cycleEventInsights,
  cycleMaturity,
  cycleTransitionSummary,
  cycleVisualStats,
  editaisNoCiclo,
  getUnifiedSubjectName,
  handleApplySuggestedQueueOrder,
  handleStrategicAlertAction,
  isResettingCycle,
  localSubjects,
  queueSuggestion,
  renderCycleTooltip,
  setResetCycleConfirmOpen,
  strategicAlerts,
  strategicPanelRef,
  strategicPanelStats,
  userCycle,
}: StrategicEditalPanelProps) {
  const highestPendingWeight = strategicPanelStats.highestPendingWeightSubject;
  const highestIncidence = strategicPanelStats.highestIncidenceTopic;
  const highestIncidenceSubject = strategicPanelStats.highestIncidenceSubject;
  const subjectStartAlerts = strategicAlerts.filter(alert => alert.actionType === 'start_subject');
  const primarySubjectAlert = subjectStartAlerts[0];
  const upcomingSubjectAlerts = subjectStartAlerts.slice(1);
  const otherStrategicAlerts = strategicAlerts.filter(alert => alert.actionType !== 'start_subject');
  const currentCycleNumber = cycleMaturity.cycleNumber;
  const canShowStrategicInsights = ['active', 'historical'].includes(cycleMaturity.phase);
  const activeCycleEditais = editaisNoCiclo.filter(edital =>
    edital.subject_ids.some(subjectId => localSubjects.find(subject => subject.id === subjectId))
  );
  const editalCycleLabel = cycleDisplayName || (activeCycleEditais.length > 0
    ? activeCycleEditais
      .map(edital => {
        const editalName = (edital.organ || edital.name || 'Edital').trim();
        const position = edital.position?.trim();
        return position ? `${editalName} • ${position}` : editalName;
      })
      .join(' | ')
    : 'Edital carregado');
  const queueMainSubjectId = queueSuggestion?.suggestedOrder?.[0] || null;
  const visibleEventInsights = cycleEventInsights.filter(insight =>
    !(queueMainSubjectId && insight.id.startsWith('priority-neglected:') && insight.subjectId === queueMainSubjectId)
  );
  const insightItems = [
    ...(cycleMaturity.phase !== 'cold_start' ? visibleEventInsights.map(insight => ({
      label: insight.title,
      value: `${insight.message} ${insight.evidence}`,
      icon: BarChart2,
      className: insight.severity === 'warning'
        ? 'border-incidence/25 bg-incidence/10 text-incidence'
        : 'border-incidence/20 bg-incidence/10 text-incidence',
    })) : []),
    canShowStrategicInsights && highestIncidenceSubject
      ? {
          label: 'Maior cobrança por matéria',
          value: `${highestIncidenceSubject.subjectName}: cobrança alta encontrada em ${highestIncidenceSubject.analyzedTopicsCount} tópico${highestIncidenceSubject.analyzedTopicsCount === 1 ? '' : 's'}.`,
          icon: Trophy,
          className: 'border-info/20 bg-info/10 text-info',
        }
      : null,
    canShowStrategicInsights && highestIncidence
      ? {
          label: 'Tópico de maior cobrança',
          value: `${highestIncidence.topicName}. Matéria: ${highestIncidence.subjectName}.`,
          icon: TrendingUp,
          className: 'border-incidence/20 bg-incidence/10 text-incidence',
        }
      : null,
    canShowStrategicInsights && highestPendingWeight
      ? {
          label: 'Maior peso pendente',
          value: `${getUnifiedSubjectName(highestPendingWeight.subject.id, highestPendingWeight.subject.name)} (${formatDerivedWeightPercentage(highestPendingWeight.percentage) || `${highestPendingWeight.effectiveWeight.value} ${highestPendingWeight.effectiveWeight.label}`})`,
          icon: Target,
          className: 'border-warning/20 bg-warning/10 text-warning',
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string; icon: typeof Target; className: string }>;
  const insightReadinessText = (() => {
    if (cycleMaturity.phase === 'cold_start') {
      return cycleMaturity.description;
    }

    if (cycleMaturity.phase === 'started') {
      return `${cycleMaturity.description} Ainda preciso de mais alguns eventos do ciclo para separar padrão real de começo normal.`;
    }

    if (cycleMaturity.phase === 'historical' && !cycleMaturity.hasSavedCycleHistory && cycleEventInsights.length === 0) {
      return `${cycleMaturity.description} As comparações finas aparecem depois que um ciclo for fechado com snapshot salvo.`;
    }

    if (!highestIncidence && !highestIncidenceSubject && cycleEventInsights.length === 0) {
      return 'Ainda não encontrei risco ou oportunidade confiável. Quando houver cobrança analisada, peso conhecido relevante ou padrão real de uso, o insight aparece aqui.';
    }

    return 'Nenhum novo insight estratégico confiável neste momento.';
  })();
  const forecastText = cycleTransitionSummary.hasNoNewTopicsToStart
    ? cycleTransitionSummary.isEditalCompleted
      ? 'Edital concluído no programa de revisão.'
      : 'Primeiro contato do edital finalizado. A prioridade agora fica em Revisões.'
    : cycleVisualStats.daysToFinish !== null && cycleVisualStats.daysToFinish > 0
      ? `Pelo ritmo de matérias fechadas neste ciclo, você fecha a fila em cerca de ${cycleVisualStats.daysToFinish} dias.`
      : null;

  return (
    <aside
      id="strategic-cycle-panel"
      ref={strategicPanelRef}
      className="block min-w-0 scroll-mt-20 xl:scroll-mt-4"
    >
      <div className="xl:sticky xl:top-4">
        <div className="space-y-3">
          <div className="app-gradient-panel overflow-hidden rounded-2xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h4 className="app-type-eyebrow text-primary">
                    Ciclo {currentCycleNumber}
                  </h4>
                  {activeCycleEditais.length > 1 && (
                    <span className="app-type-badge rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-primary">
                      {activeCycleEditais.length} editais combinados
                    </span>
                  )}
                </div>
                {renderCycleTooltip(
                  editalCycleLabel,
                  <p className="app-type-caption mt-1 overflow-hidden break-words text-content-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
                    {editalCycleLabel}
                  </p>
                )}
              </div>
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-primary/25 bg-surface/60 backdrop-blur">
                <span className="text-base font-bold text-title-card tabular-nums">{strategicPanelStats.coveragePercentage}%</span>
              </div>
            </div>
            <div className="app-progress-track mt-4 h-1.5 w-full overflow-hidden rounded-full">
              <div
                className="app-progress-fill h-full rounded-full transition-all duration-500"
                style={{ width: `${strategicPanelStats.coveragePercentage}%` }}
              />
            </div>
            {forecastText && (
              <div className="mt-3 flex items-start gap-2 text-content-muted">
                <Gauge size={14} className="mt-0.5 shrink-0 text-primary" />
                <p className="app-type-caption min-w-0">
                  {forecastText}
                </p>
              </div>
            )}
            <div className="app-responsive-stat-grid mt-4">
              <div className="rounded-xl border app-hairline bg-surface/55 px-3 py-2 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <p className="app-type-eyebrow text-content-muted">Matérias iniciadas</p>
                  <p className="text-sm font-bold text-title-card tabular-nums">
                    {strategicPanelStats.startedSubjectsCount ?? 0}/{strategicPanelStats.totalSubjects ?? cycleVisualStats.totalSubjects}
                  </p>
                </div>
                <p className="app-type-caption mt-1 text-content-muted">
                  {(strategicPanelStats.startedSubjectsCount ?? 0) > 0
                    ? `${strategicPanelStats.startedSubjectsCount} de ${strategicPanelStats.totalSubjects ?? cycleVisualStats.totalSubjects} matérias com estudo em andamento.`
                    : 'Nenhuma matéria com estudo iniciado ainda.'}
                </p>
              </div>
              <div className="rounded-xl border app-hairline bg-surface/55 px-3 py-2 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <p className="app-type-eyebrow text-content-muted">Tópicos iniciados</p>
                  <p className="text-sm font-bold text-title-card tabular-nums">
                    {cycleTransitionSummary.startedTopics}/{cycleTransitionSummary.totalTopics}
                  </p>
                </div>
                <p className="app-type-caption mt-1 text-content-muted">
                  {cycleTransitionSummary.unstartedTopics > 0
                    ? `${cycleTransitionSummary.unstartedTopics} tópicos restantes para o 1º contato.`
                    : 'Todos os tópicos do ciclo iniciados.'}
                </p>
              </div>
            </div>
          </div>

          {strategicAlerts.length > 0 && (
            <div className="app-glass rounded-2xl p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="app-type-eyebrow text-warning">
                  {primarySubjectAlert ? 'Prioridades do edital' : 'Atenção estratégica'}
                </h4>
                <AlertCircle size={15} className="text-warning" />
              </div>
              <div className="space-y-2">
                {primarySubjectAlert && (() => {
                  const style = alertStyles[primarySubjectAlert.severity];
                  return (
                    <div className={`rounded-xl border p-3 ${style.card}`}>
                      <div className="mb-2 flex items-start gap-2">
                        <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${style.icon}`}>
                          <AlertCircle size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="app-type-badge opacity-80">Agora</span>
                            <p className="app-type-eyebrow text-title-card">{primarySubjectAlert.subjectName}</p>
                          </div>
                          <p className="app-type-body-small mt-1 text-title-card">{primarySubjectAlert.message}</p>
                          <p className="app-type-caption mt-1 text-content-muted">{primarySubjectAlert.evidence}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStrategicAlertAction(primarySubjectAlert)}
                        className="app-type-action-xs mt-1 h-7 rounded-lg border app-hairline bg-surface/45 px-2.5 text-foreground transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                      >
                        {primarySubjectAlert.actionLabel}
                      </button>
                    </div>
                  );
                })()}

                {upcomingSubjectAlerts.length > 0 && (
                  <div className="rounded-xl border app-hairline bg-surface/35 px-3 py-2">
                    <p className="app-type-caption mb-1.5 text-content-muted">Depois, na ordem de peso</p>
                    <div className="divide-y divide-border/60">
                      {upcomingSubjectAlerts.map((alert, index) => (
                        <button
                          key={alert.id}
                          type="button"
                          onClick={() => handleStrategicAlertAction(alert)}
                          className="flex w-full items-center gap-2 py-1.5 text-left transition-colors hover:text-primary"
                        >
                          <span className="app-type-badge shrink-0 text-content-muted">{index + 2}</span>
                          <span className="app-type-body-small min-w-0 flex-1 truncate text-title-card">{alert.subjectName}</span>
                          <span className="app-type-caption shrink-0 text-content-muted">{alert.evidence.replace(' entre as matérias com peso informado.', '')}</span>
                          <ChevronRight size={14} className="shrink-0 text-content-muted" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {otherStrategicAlerts.map(alert => {
                  const style = alertStyles[alert.severity];
                  return (
                    <div key={alert.id} className={`rounded-xl border p-3 ${style.card}`}>
                      <div className="mb-2 flex items-start gap-2">
                        <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${style.icon}`}>
                          <AlertCircle size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="app-type-badge opacity-80">{style.label}</span>
                            <p className="app-type-eyebrow text-title-card">{alert.title}</p>
                          </div>
                          <p className="app-type-body-small mt-1 text-title-card">{alert.message}</p>
                          <p className="app-type-caption mt-1 text-content-muted">{alert.evidence}</p>
                        </div>
                      </div>
                      {alert.actionLabel && alert.actionType !== 'none' && (
                        <button
                          type="button"
                          onClick={() => handleStrategicAlertAction(alert)}
                          className="app-type-action-xs mt-1 h-7 rounded-lg border app-hairline bg-surface/45 px-2.5 text-foreground transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                        >
                          {alert.actionLabel}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {queueSuggestion && (
            <div className="rounded-2xl border border-incidence/20 bg-incidence/[0.07] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="app-type-eyebrow text-incidence">
                  Ajuste sugerido da fila
                </h4>
                <ListTodo size={15} className="text-incidence" />
              </div>
              <div className="rounded-xl border border-incidence/20 bg-surface/45 p-3 backdrop-blur">
                <div className="mb-2 flex items-center gap-2">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-incidence/15 text-incidence">
                    <MoveUp size={14} />
                  </div>
                  <p className="app-type-eyebrow text-incidence">
                    {queueSuggestion.title}
                  </p>
                </div>
                <p className="app-type-body-small text-title-card">{queueSuggestion.message}</p>
                <p className="app-type-caption mt-1 text-content-muted">{queueSuggestion.evidence}</p>
                {queueSuggestion.limitations.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {queueSuggestion.limitations.map(limit => (
                      <p key={limit} className="app-type-caption text-content-muted">
                        {limit}
                      </p>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleApplySuggestedQueueOrder(queueSuggestion.suggestedOrder)}
                  className="app-type-action-xs mt-3 h-8 rounded-lg border border-incidence/25 bg-incidence/10 px-3 text-incidence transition-colors hover:border-incidence/50 hover:bg-incidence/20"
                >
                  Aplicar sugestão
                </button>
              </div>
            </div>
          )}

          <div className="app-surface rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="app-type-eyebrow text-content-muted">
                Insights
              </h4>
              <span className="app-type-badge inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/5 px-2 py-1 text-primary">
                <Sparkles size={11} />
                {cycleMaturity.label}
              </span>
            </div>
            {insightItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {insightItems.slice(0, 4).map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className={`rounded-xl border p-3 ${item.className}`}>
                      <div className="mb-2 flex items-center gap-2">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface/55 backdrop-blur">
                          <Icon size={14} />
                        </div>
                        <p className="app-type-eyebrow">{item.label}</p>
                      </div>
                      <p className="app-type-body-small text-title-card">{item.value}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-primary/20 bg-primary/5 p-3">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <Sparkles size={14} />
                  <span className="app-type-eyebrow">Sem sinal confiável ainda</span>
                </div>
                <p className="text-xs text-content-muted leading-relaxed">
                  {insightReadinessText}
                </p>
              </div>
            )}
          </div>

          {userCycle && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setResetCycleConfirmOpen(true)}
                disabled={isResettingCycle}
                className="app-type-action-xs inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-destructive/70 transition-colors hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Reiniciar ciclo de estudos"
              >
                {isResettingCycle ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                <span>Resetar ciclo</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
