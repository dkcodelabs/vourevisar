import type { ReactElement, ReactNode } from 'react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  FileText,
  Play,
  Square,
  Wand2,
} from 'lucide-react';

import type { Topic } from '@/types';

type TopicStatusVisual = {
  label: string;
  indicatorClassName: string;
  actionClassName: string;
};

type StartedTopicCta = {
  tooltip: string;
  ariaLabel: string;
  label: string;
};

type CycleTopicRowProps = {
  activeStudySessionStatus: 'RUNNING' | 'PAUSED' | null;
  completed: boolean;
  hasStarted: boolean;
  incidenceDisplay: string | null;
  incidenceTitle: string;
  onGoToReview: () => void;
  onOpenNotes: () => void;
  onStudyAction: () => void;
  renderCycleTooltip: (
    content: ReactNode,
    trigger: ReactElement,
    side?: 'top' | 'right' | 'bottom' | 'left'
  ) => ReactNode;
  startedTopicCta: StartedTopicCta;
  statusLabel: string;
  statusVisual: TopicStatusVisual;
  studiedInCurrentCycle: boolean;
  topic: Topic;
};

const hasTopicNotes = (topic: Topic) => {
  const content = typeof topic.notes === 'string' ? topic.notes : topic.notes?.content;
  return Boolean(content?.trim()) && content !== '<p><br></p>';
};

export function CycleTopicRow({
  activeStudySessionStatus,
  completed,
  hasStarted,
  incidenceDisplay,
  incidenceTitle,
  onGoToReview,
  onOpenNotes,
  onStudyAction,
  renderCycleTooltip,
  startedTopicCta,
  statusLabel,
  statusVisual,
  studiedInCurrentCycle,
  topic,
}: CycleTopicRowProps) {
  return (
    <div
      data-topic-item
      data-topic-id={topic.id}
      className="app-cycle-topic-row relative grid min-h-10 cursor-default grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 border-t app-hairline py-2.5 pl-3 pr-3 transition-colors first:border-t-0 group/topic sm:gap-x-3 sm:pl-4 sm:pr-4"
    >
      {renderCycleTooltip(
        statusLabel,
        <div
          className="flex h-full min-h-7 w-4 cursor-help select-none items-center justify-center rounded-md transition-colors hover:bg-control-hover/40"
          data-topic-status-indicator
          role="img"
          aria-label={statusLabel}
        >
          <div className={`h-5 w-1 rounded-full ${statusVisual.indicatorClassName}`} />
        </div>
      )}

      <div className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={`app-topic-title app-type-body-small min-w-0 max-w-full transition-opacity ${
              completed ? 'text-content-muted opacity-50' : 'text-content-main'
            }`}
          >
            {topic.name.charAt(0).toUpperCase() + topic.name.slice(1)}
          </span>
          {studiedInCurrentCycle && !completed && renderCycleTooltip(
            'Tópico iniciado neste ciclo',
            <CheckCircle2
              size={12}
              className="flex-shrink-0 text-content-muted"
              role="img"
              aria-label={`Tópico iniciado neste ciclo: ${topic.name}`}
            />
          )}
        </div>
        {incidenceDisplay && (
          <div className="flex min-w-0">
            {renderCycleTooltip(
              incidenceTitle,
              <span className="app-type-badge max-w-full truncate rounded border border-incidence/20 bg-incidence/10 px-1.5 py-0.5 text-incidence">
                {incidenceDisplay}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex min-w-0 items-center justify-end gap-1 self-center">
        <div
          className={`hidden md:flex h-6 items-center gap-1 transition-all duration-200 opacity-0 pointer-events-none group-hover/topic:pointer-events-auto ${completed ? 'group-hover/topic:opacity-40' : 'group-hover/topic:opacity-100'}`}
        >
          {renderCycleTooltip(
            'Abrir assistente de IA',
            <button
              type="button"
              className="h-6 w-6 rounded-full border border-transparent bg-transparent text-content-muted/45 hover:border-primary/25 hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center"
              aria-label={`Abrir assistente de IA para ${topic.name}`}
            >
              <Wand2 size={12} />
            </button>
          )}
          {renderCycleTooltip(
            `Anotações para ${topic.name}`,
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenNotes();
              }}
              className={`h-6 w-6 rounded-full border border-transparent bg-transparent transition-all flex items-center justify-center ${
                hasTopicNotes(topic)
                  ? 'text-primary/60 hover:border-primary/25 hover:bg-primary/10 hover:text-primary'
                  : 'text-content-muted/45 hover:border-primary/25 hover:bg-primary/10 hover:text-primary'
              }`}
              aria-label={`Anotações para ${topic.name}`}
            >
              <FileText size={12} />
            </button>
          )}
        </div>
        <div className="flex-shrink-0">
          {completed ? (
            <span className="app-type-action-xs ml-0.5 flex h-7 flex-shrink-0 items-center justify-center gap-1.5 rounded-lg border border-success/15 bg-success/10 px-2.5 text-success">
              <Check size={11} />
              <span className="hidden sm:inline">Concluído</span>
            </span>
          ) : activeStudySessionStatus === 'RUNNING' ? (
            renderCycleTooltip(
              'Parar estudo e abrir avaliação',
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onStudyAction();
                }}
                className="app-type-action-xs ml-0.5 flex h-7 flex-shrink-0 items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 text-primary transition-all"
                aria-label={`Parar estudo do tópico ${topic.name} e abrir avaliação`}
              >
                <Square size={10} className="fill-current" />
                <span className="hidden sm:inline">Parar</span>
              </button>
            )
          ) : activeStudySessionStatus === 'PAUSED' ? (
            renderCycleTooltip(
              'Retomar estudo do tópico',
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onStudyAction();
                }}
                className="app-type-action-xs ml-0.5 flex h-7 flex-shrink-0 items-center justify-center gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-2.5 text-warning transition-all"
                aria-label={`Retomar estudo do tópico ${topic.name}`}
              >
                <Play size={10} className="ml-[1px] fill-current" />
                <span className="hidden sm:inline">Retomar</span>
              </button>
            )
          ) : hasStarted ? (
            renderCycleTooltip(
              startedTopicCta.tooltip,
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onGoToReview();
                }}
                className={`app-type-action-xs flex-shrink-0 h-7 px-2.5 rounded-lg flex items-center justify-center gap-1.5 border transition-all ml-0.5 ${statusVisual.actionClassName}`}
                aria-label={startedTopicCta.ariaLabel}
              >
                <BookOpen size={11} />
                <span className="hidden sm:inline">{startedTopicCta.label}</span>
              </button>
            )
          ) : (
            renderCycleTooltip(
              'Iniciar estudo do tópico',
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onStudyAction();
                }}
                className={`app-type-action-xs flex-shrink-0 h-7 px-2.5 rounded-lg border transition-all duration-300 flex items-center justify-center gap-1.5 ml-0.5 group ${statusVisual.actionClassName}`}
                aria-label={`Iniciar estudo do tópico ${topic.name}`}
              >
                <Play size={10} className="ml-[1px] opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                <span className="hidden sm:inline">Iniciar</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
