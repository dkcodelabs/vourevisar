import type { ReactElement, ReactNode } from 'react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  FileText,
  ListTodo,
  Play,
  Square,
} from 'lucide-react';

import type { Subject, Topic } from '@/types';

type TopicStatusVisual = {
  actionClassName: string;
  indicatorClassName: string;
};

type VerticalTopicStatus = {
  label: string;
  className: string;
};

type StartedTopicCta = {
  tooltip: string;
  ariaLabel: string;
  label: string;
};

type VerticalSubjectItem = {
  id: string;
  subject: Subject;
  topics: Topic[];
};

type VerticalEditalViewProps = {
  emptySearchQuery: string;
  expandedSubjectIds: string[];
  getCycleTopicStatusVisual: (topic: Topic, hasStarted: boolean) => TopicStatusVisual;
  getStartedTopicCta: (topicName: string) => StartedTopicCta;
  getStrategicTopicIncidenceDisplay: (topic: Topic) => string | null;
  getStrategicTopicIncidenceTitle: (topic: Topic) => string;
  getSubjectTopicSummaryLabel: (subject: Subject, activeSubjectTopics: Topic[]) => string;
  getTopicContactCount: (topic: Topic) => number;
  getUnifiedSubjectName: (subjectId: string, fallbackName: string) => string;
  getVerticalTopicStatus: (topic: Topic, hasStarted: boolean) => VerticalTopicStatus;
  isTopicCompleted: (topic: Topic) => boolean;
  isTopicNewlyStartedInCycle: (topic: Topic) => boolean;
  isTopicStarted: (topic: Topic) => boolean;
  isWeightLineActive: (subjectId: string) => boolean;
  getTopicStudySessionStatus: (topicId: string) => 'RUNNING' | 'PAUSED' | null;
  onGoToReview: (topicId: string) => void;
  onStudyAction: (topicId: string) => void;
  onOpenTopicNotes: (subjectId: string, topicId: string) => void;
  renderCycleTooltip: (
    content: ReactNode,
    trigger: ReactElement,
    side?: 'top' | 'right' | 'bottom' | 'left'
  ) => ReactNode;
  renderSubjectWeightControl: (subject: Subject) => ReactNode;
  subjects: VerticalSubjectItem[];
  summary: ReactNode;
};

const hasTopicNotes = (topic: Topic) => {
  const content = typeof topic.notes === 'string' ? topic.notes : topic.notes?.content;
  return Boolean(content?.trim()) && content !== '<p><br></p>';
};

const sortTopicsForVerticalView = (topics: Topic[]) =>
  topics.slice().sort((a, b) => {
    if (a.position !== undefined && b.position !== undefined) return a.position - b.position;
    if (!a.created_at && !b.created_at) return 0;
    if (!a.created_at) return 1;
    if (!b.created_at) return -1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

export function VerticalEditalView({
  emptySearchQuery,
  expandedSubjectIds,
  getCycleTopicStatusVisual,
  getStartedTopicCta,
  getStrategicTopicIncidenceDisplay,
  getStrategicTopicIncidenceTitle,
  getSubjectTopicSummaryLabel,
  getTopicContactCount,
  getUnifiedSubjectName,
  getVerticalTopicStatus,
  isTopicCompleted,
  isTopicNewlyStartedInCycle,
  isTopicStarted,
  isWeightLineActive,
  getTopicStudySessionStatus,
  onGoToReview,
  onStudyAction,
  onOpenTopicNotes,
  renderCycleTooltip,
  renderSubjectWeightControl,
  subjects,
  summary,
}: VerticalEditalViewProps) {
  return (
    <>
      {summary}
      <div className="app-vertical-list w-full overflow-hidden rounded-2xl">
        {subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-content-muted">
            <FileText size={28} className="mb-3 opacity-50" />
            <p className="text-sm font-semibold">Nenhum tópico encontrado{emptySearchQuery.trim() ? ` para "${emptySearchQuery}"` : ''}.</p>
          </div>
        ) : (
          subjects.map(({ subject, topics }) => {
            const isExpanded = expandedSubjectIds.includes(subject.id);
            const subjectTopicSummaryLabel = getSubjectTopicSummaryLabel(subject, topics);
            const weightLineActive = isWeightLineActive(subject.id);

            return (
              <div key={subject.id} className="border-b app-hairline last:border-b-0">
                <div className="app-vertical-subject-header sticky top-0 z-10 flex w-full items-start gap-2 border-b px-3 py-2 backdrop-blur-md sm:px-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="app-type-card-title overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] text-title-card">
                      {getUnifiedSubjectName(subject.id, subject.name)}
                    </h4>
                    <div className="app-type-meta mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-content-muted">
                      {weightLineActive ? (
                        renderSubjectWeightControl(subject)
                      ) : (
                        <>
                          <span className="flex min-w-0 items-center gap-0.5 break-words">
                            <ListTodo size={10} /> {subjectTopicSummaryLabel}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-content-muted/30" aria-hidden="true" />
                          {renderSubjectWeightControl(subject)}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && sortTopicsForVerticalView(topics).map((topic) => {
                  const contactCount = getTopicContactCount(topic);
                  const hasStarted = contactCount > 0 || isTopicStarted(topic);
                  const status = getVerticalTopicStatus(topic, hasStarted);
                  const statusVisual = getCycleTopicStatusVisual(topic, hasStarted);
                  const startedTopicCta = getStartedTopicCta(topic.name);
                  const studiedInCurrentCycle = isTopicNewlyStartedInCycle(topic);
                  const incidenceTitle = getStrategicTopicIncidenceTitle(topic);
                  const incidenceDisplay = getStrategicTopicIncidenceDisplay(topic);
                  const completed = isTopicCompleted(topic);
                  const studySessionStatus = getTopicStudySessionStatus(topic.id);
                  const renderVerticalTopicNotesButton = () => renderCycleTooltip(
                    `Anotações para ${topic.name}`,
                    <button
                      onClick={() => onOpenTopicNotes(subject.id, topic.id)}
                      className={`grid h-7 w-7 place-items-center rounded-full border border-transparent bg-transparent transition-all ${
                        hasTopicNotes(topic)
                          ? 'text-primary/70 hover:border-primary/25 hover:bg-primary/10 hover:text-primary'
                          : 'text-content-muted/45 hover:border-primary/25 hover:bg-primary/10 hover:text-primary'
                      }`}
                      aria-label={`Anotações para ${topic.name}`}
                    >
                      <FileText size={12} />
                    </button>
                  );
                  const renderVerticalTopicIncidenceBadge = () => incidenceDisplay
                    ? renderCycleTooltip(
                        incidenceTitle,
                        <span className="app-type-badge max-w-[8rem] truncate rounded border border-incidence/20 bg-incidence/10 px-1.5 py-0.5 text-incidence">
                          {incidenceDisplay}
                        </span>
                      )
                    : null;
                  const mobileTopicAction = completed ? (
                    renderCycleTooltip(
                      'Tópico concluído: revisões finalizadas.',
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-success/15 bg-success/10 text-success"
                        aria-label={`Tópico concluído: ${topic.name}`}
                      >
                        <Check size={11} />
                      </span>
                    )
                  ) : studySessionStatus === 'RUNNING' ? (
                    renderCycleTooltip(
                      'Parar estudo e abrir avaliação',
                      <button
                        onClick={() => onStudyAction(topic.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary transition-all"
                        aria-label={`Parar estudo do tópico ${topic.name} e abrir avaliação`}
                      >
                        <Square size={10} className="fill-current" />
                      </button>
                    )
                  ) : studySessionStatus === 'PAUSED' ? (
                    renderCycleTooltip(
                      'Retomar estudo do tópico',
                      <button
                        onClick={() => onStudyAction(topic.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-warning/30 bg-warning/10 text-warning transition-all"
                        aria-label={`Retomar estudo do tópico ${topic.name}`}
                      >
                        <Play size={10} className="ml-[1px] fill-current" />
                      </button>
                    )
                  ) : hasStarted ? (
                    renderCycleTooltip(
                      startedTopicCta.tooltip,
                      <button
                        onClick={() => onGoToReview(topic.id)}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${statusVisual.actionClassName}`}
                        aria-label={startedTopicCta.ariaLabel}
                      >
                        <BookOpen size={11} />
                      </button>
                    )
                  ) : (
                    renderCycleTooltip(
                      'Iniciar estudo do tópico',
                      <button
                        onClick={() => onStudyAction(topic.id)}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${statusVisual.actionClassName}`}
                        aria-label={`Iniciar estudo do tópico ${topic.name}`}
                      >
                        <Play size={10} className="ml-[1px]" />
                      </button>
                    )
                  );

                  return (
                    <div
                      key={topic.id}
                      className="group/topic app-vertical-topic-row relative grid gap-y-1.5 border-b app-hairline px-3 py-2 pl-4 transition-colors last:border-b-0 sm:px-4 sm:pl-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-x-3 lg:py-2"
                    >
                      <div
                        className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full sm:w-1 ${statusVisual.indicatorClassName}`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <span className={`app-topic-title app-type-body-small block ${completed ? 'text-content-muted line-through decoration-content-muted/40' : topic.is_active === false ? 'text-content-muted opacity-50' : 'text-content-main'}`}>
                          {topic.name}
                          {studiedInCurrentCycle && !completed && (
                            renderCycleTooltip(
                              'Tópico iniciado neste ciclo',
                              <CheckCircle2
                                size={12}
                                className="ml-1 inline-block align-[-2px] text-content-muted/70"
                                aria-label="Tópico iniciado neste ciclo"
                              />
                            )
                          )}
                          {topic.is_active === false && <span className="text-[9px] ml-1 uppercase opacity-60">(inativo)</span>}
                        </span>
                      </div>

                      <div className="flex min-w-0 items-center justify-end gap-1 lg:hidden">
                        {renderVerticalTopicIncidenceBadge()}
                        {renderVerticalTopicNotesButton()}
                        {mobileTopicAction}
                      </div>

                      <div className="hidden min-w-0 items-center justify-between gap-2 opacity-90 transition-opacity group-hover/topic:opacity-100 lg:flex lg:justify-end">
                        <span className="sr-only">{status.label}</span>
                        <div className="grid shrink-0 grid-cols-[minmax(0,auto)_6.75rem] items-center gap-1 sm:grid-cols-[minmax(0,auto)_7.5rem]">
                          <div className="flex min-w-0 items-center justify-end gap-1">
                            {renderVerticalTopicIncidenceBadge()}
                            {renderVerticalTopicNotesButton()}
                          </div>

                          {completed ? (
                            renderCycleTooltip(
                              'Tópico concluído: revisões finalizadas.',
                              <span className="app-type-action-xs flex h-6 w-[5.75rem] items-center justify-center gap-1 rounded-lg border border-success/15 bg-success/10 px-2 text-success sm:w-[6.25rem]">
                                <Check size={11} />
                                Concluído
                              </span>
                            )
                          ) : studySessionStatus === 'RUNNING' ? (
                            renderCycleTooltip(
                              'Parar estudo e abrir avaliação',
                              <button
                                onClick={() => onStudyAction(topic.id)}
                                className="app-type-action-xs flex h-7 w-[6.75rem] items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2 text-primary transition-all sm:w-[7.5rem]"
                                aria-label={`Parar estudo do tópico ${topic.name} e abrir avaliação`}
                              >
                                <Square size={10} className="fill-current" />
                                Parar
                              </button>
                            )
                          ) : studySessionStatus === 'PAUSED' ? (
                            renderCycleTooltip(
                              'Retomar estudo do tópico',
                              <button
                                onClick={() => onStudyAction(topic.id)}
                                className="app-type-action-xs flex h-7 w-[6.75rem] items-center justify-center gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-2 text-warning transition-all sm:w-[7.5rem]"
                                aria-label={`Retomar estudo do tópico ${topic.name}`}
                              >
                                <Play size={10} className="ml-[1px] fill-current" />
                                Retomar
                              </button>
                            )
                          ) : hasStarted ? (
                            renderCycleTooltip(
                              startedTopicCta.tooltip,
                              <button
                                onClick={() => onGoToReview(topic.id)}
                                className={`app-type-action-xs flex h-7 w-[6.75rem] items-center justify-center gap-1.5 rounded-lg border px-2 transition-all sm:w-[7.5rem] ${statusVisual.actionClassName}`}
                                aria-label={startedTopicCta.ariaLabel}
                              >
                                <BookOpen size={11} />
                                {startedTopicCta.label}
                              </button>
                            )
                          ) : (
                            renderCycleTooltip(
                              'Iniciar estudo do tópico',
                              <button
                                onClick={() => onStudyAction(topic.id)}
                                className={`app-type-action-xs flex h-7 w-[5.75rem] items-center justify-center gap-1.5 rounded-lg border px-2 transition-all sm:w-[6.75rem] ${statusVisual.actionClassName}`}
                                aria-label={`Iniciar estudo do tópico ${topic.name}`}
                              >
                                <Play size={10} className="ml-[1px]" />
                                Iniciar<span className="hidden sm:inline"> estudo</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
