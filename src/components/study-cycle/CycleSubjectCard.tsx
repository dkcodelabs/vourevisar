import type { ReactElement, ReactNode } from 'react';
import {
  Check,
  Edit2,
  GripVertical,
  Link2Off,
  ListTodo,
  RotateCcw,
} from 'lucide-react';

import { SortableItem } from '@/components/SortableItem';
import type { Subject } from '@/types';
import type { StudyCycleSubjectActionState } from '@/utils/studyCycleSubjectState';

type CycleSubjectCardProps = {
  activeTab: 'all' | 'vertical';
  children: ReactNode;
  hasTopics: boolean;
  isClosedInCycle: boolean;
  isCompletedInEdital: boolean;
  isExpanded: boolean;
  isHighlighted: boolean;
  isMerged: boolean;
  isReorderingCycle: boolean;
  isWeightLineActive: boolean;
  itemId: string;
  needsCycleClosure: boolean;
  onManageSubject: () => void;
  onMarkStudied: () => void;
  onOpenRevertMerge: () => void;
  onReturnToQueue: () => void;
  onToggleExpand: () => void;
  renderCycleTooltip: (
    content: ReactNode,
    trigger: ReactElement,
    side?: 'top' | 'right' | 'bottom' | 'left'
  ) => ReactNode;
  subject: Subject;
  subjectActionState: StudyCycleSubjectActionState;
  subjectDisplayName: string;
  subjectTopicSummaryLabel: string;
  weightControl: ReactNode;
};

export function CycleSubjectCard({
  activeTab,
  children,
  hasTopics,
  isClosedInCycle,
  isCompletedInEdital,
  isExpanded,
  isHighlighted,
  isMerged,
  isReorderingCycle,
  isWeightLineActive,
  itemId,
  needsCycleClosure,
  onManageSubject,
  onMarkStudied,
  onOpenRevertMerge,
  onReturnToQueue,
  onToggleExpand,
  renderCycleTooltip,
  subject,
  subjectActionState,
  subjectDisplayName,
  subjectTopicSummaryLabel,
  weightControl,
}: CycleSubjectCardProps) {
  return (
    <SortableItem key={itemId} id={itemId} lockAxis="vertical" disabled={!isReorderingCycle}>
      {({ listeners, attributes }) => (
        <div className="w-full max-w-full flex items-start gap-1.5" data-subject-item>
          <div
            className={`h-[56px] w-5 shrink-0 items-center justify-center rounded-xl border transition-all touch-none ${
              isReorderingCycle
                ? 'flex cursor-grab border-warning/20 bg-warning/10 text-warning shadow-[0_0_18px_hsl(var(--warning)/0.10)] active:cursor-grabbing'
                : 'hidden'
            }`}
            onClick={(event) => event.stopPropagation()}
            {...listeners}
            {...attributes}
            aria-label={`Arrastar ${subjectDisplayName} para reorganizar a fila`}
          >
            <GripVertical size={isReorderingCycle ? 16 : 14} />
          </div>

          <div
            className={`overflow-hidden rounded-2xl border backdrop-blur transition-all ${
              isExpanded
                ? isClosedInCycle
                  ? 'border-success/25'
                  : 'app-hairline shadow-sm'
                : isClosedInCycle
                  ? 'border-success/20 hover:border-success/35'
                  : 'app-hairline'
            } ${isClosedInCycle ? 'app-cycle-subject-closed' : 'app-cycle-subject'} ${isReorderingCycle ? 'ring-1 ring-warning/15 shadow-[0_8px_26px_rgba(0,0,0,0.10)]' : ''} flex-1 min-w-0`}
          >
            <div
              data-subject-id={subject.id}
              onClick={onToggleExpand}
              className={`min-h-[64px] pl-2 pr-4 py-2 flex items-center gap-2 group cursor-pointer relative transition-colors ${
                isClosedInCycle ? 'bg-success/[0.055]' : ''
              } ${isHighlighted ? 'study-cycle-subject-focus' : ''}`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="flex items-start gap-1.5 min-w-0 flex-1">
                  {renderCycleTooltip(
                    'Gerenciar no edital',
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onManageSubject();
                      }}
                      className="mt-[1px] p-0.5 text-content-muted/45 transition-colors hover:text-primary"
                      aria-label={`Gerenciar ${subjectDisplayName} no edital`}
                    >
                      <Edit2 size={11} />
                    </button>
                  )}

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <h4 className={`app-type-card-title overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${
                      isClosedInCycle ? 'text-content-muted' : 'text-title-card'
                    }`}>
                      {subjectDisplayName.charAt(0).toUpperCase() + subjectDisplayName.slice(1)}
                    </h4>

                    <div className="app-type-meta mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-content-muted">
                      {isWeightLineActive && !isClosedInCycle ? (
                        weightControl
                      ) : (
                        <>
                          <span className="flex min-w-0 items-center gap-0.5 break-words">
                            <ListTodo size={10} /> {subjectTopicSummaryLabel}
                          </span>
                          {!isClosedInCycle && (
                            <>
                              <span className="h-1 w-1 rounded-full bg-content-muted/30" aria-hidden="true" />
                              {weightControl}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {isMerged && renderCycleTooltip(
                    'Desfazer mesclagem',
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenRevertMerge();
                      }}
                      className="w-fit rounded p-1 text-warning transition-colors hover:bg-warning/10"
                      aria-label={`Desfazer mesclagem de ${subjectDisplayName}`}
                    >
                      <Link2Off size={14} />
                    </button>
                  )}
                </div>
              </div>

              {!isWeightLineActive && (
                <div className="flex items-center gap-2 shrink-0">
                  {activeTab === 'all' && (
                    <>
                      {subjectActionState.kind === 'locked_completed' || subjectActionState.kind === 'locked_started' ? (
                        renderCycleTooltip(
                          subjectActionState.tooltip,
                          <button
                            onClick={(event) => event.stopPropagation()}
                            aria-disabled="true"
                            className="relative flex h-6 w-6 shrink-0 cursor-default items-center justify-center rounded-full border border-success/25 bg-success/10 text-success opacity-80"
                            aria-label={isCompletedInEdital
                              ? `${subjectDisplayName} concluída no edital`
                              : `${subjectDisplayName} concluída no ciclo`}
                          >
                            <Check size={12} strokeWidth={3} />
                          </button>
                        )
                      ) : subjectActionState.kind === 'return_to_queue' ? (
                        renderCycleTooltip(
                          subjectActionState.tooltip,
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              onReturnToQueue();
                            }}
                            className="group/return relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-success/25 bg-success/10 text-success transition-all hover:border-success/35 hover:bg-success/15 hover:text-success"
                            aria-label={`Voltar ${subjectDisplayName} para a fila do ciclo`}
                          >
                            <Check size={12} strokeWidth={3} className="transition-all group-hover/return:scale-0 group-hover/return:opacity-0" />
                            <RotateCcw size={11} className="absolute scale-0 opacity-0 transition-all group-hover/return:scale-100 group-hover/return:opacity-100" />
                          </button>
                        )
                      ) : (
                        renderCycleTooltip(
                          subjectActionState.tooltip,
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              onMarkStudied();
                            }}
                            aria-label={`Marcar ${subjectDisplayName} como estudada`}
                            className={`relative w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                              needsCycleClosure
                                ? 'border-warning/70 bg-warning/10 text-warning shadow-[0_0_0_3px_hsl(var(--warning)/0.10)] before:absolute before:inset-[-5px] before:rounded-full before:border before:border-warning/30 before:animate-pulse hover:border-success/80 hover:bg-success hover:text-success-foreground hover:shadow-none'
                                : 'border-border-strong/70 bg-surface/30 text-content-muted hover:border-success/70 hover:bg-success hover:text-success-foreground dark:bg-surface/20'
                            }`}
                          >
                            <Check size={12} strokeWidth={3} />
                          </button>
                        )
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {isExpanded && (
              <div
                className="border-t app-hairline"
                onClick={(event) => event.stopPropagation()}
              >
                {!hasTopics ? (
                  <div className="py-4 text-center text-xs text-content-muted">
                    Nenhum tópico cadastrado
                  </div>
                ) : (
                  children
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </SortableItem>
  );
}
