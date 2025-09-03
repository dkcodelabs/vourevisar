import React, { useMemo } from 'react';
import type { StudyCycleSubject } from '@/types/study-cycle';
import { ReviewInterval } from '@/types/study-cycle';
import { StudyCycleTopicItem } from './StudyCycleTopicItem';
import { ChevronDownIcon } from './Icons';
import { NotebookPen } from 'lucide-react';

interface StudyCycleSubjectCardProps {
  subject: StudyCycleSubject;
  onCompleteSession: (subjectId: string) => void;
  onOpenNotes: (subjectId: string, topicId: string) => void;
  onSubjectNotesClick: () => void;
  isActionable: boolean;
  isStudyFocus: boolean;
  viewMode: 'grid' | 'list';
  isExpanded: boolean;
  onToggleExpand: () => void;
  markedTopicIds: Set<string>;
  onToggleMark: (topicId: string) => void;
}

const reviewProgression = [
  ReviewInterval.NOT_STARTED,
  ReviewInterval.REVISED_7D,
  ReviewInterval.REVISED_15D,
  ReviewInterval.REVISED_30D,
  ReviewInterval.COMPLETED,
];

export const StudyCycleSubjectCard: React.FC<StudyCycleSubjectCardProps> = ({
  subject,
  onCompleteSession,
  onOpenNotes,
  onSubjectNotesClick,
  isActionable,
  isStudyFocus,
  viewMode,
  isExpanded,
  onToggleExpand,
  markedTopicIds,
  onToggleMark
}) => {
  const isFullyCompleted = useMemo(() => subject.topics.every(t => t.reviewStatus === ReviewInterval.COMPLETED), [subject.topics]);

  const progress = useMemo(() => {
    if (subject.topics.length === 0) return 0;
    if (isFullyCompleted) return 100;

    const totalSteps = subject.topics.length * (reviewProgression.length - 1);
    const completedSteps = subject.topics.reduce((acc, topic) => {
      const index = reviewProgression.indexOf(topic.reviewStatus);
      return acc + (index > -1 ? index : 0);
    }, 0);
    return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  }, [subject.topics, isFullyCompleted]);

  const handleComplete = () => {
    onCompleteSession(subject.id);
  };

  const cardBaseClasses = "bg-card rounded-2xl shadow-md overflow-hidden transition-all duration-300";
  const focusClasses = isStudyFocus
    ? 'relative transform scale-[1.03] shadow-[0_0_20px_rgba(14,165,233,0.2)] dark:shadow-[0_0_20px_rgba(56,189,248,0.15)] z-10'
    : '';

  if (isFullyCompleted && viewMode === 'grid') {
    return (
      <div className="bg-card rounded-2xl shadow-md overflow-hidden flex flex-col">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base text-card-foreground" style={{ fontWeight: 700 }}>{subject.name}</h3>
            <button
              onClick={onSubjectNotesClick}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
              title="Anotações da matéria"
            >
              <NotebookPen className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className="bg-emerald-500 h-2.5 rounded-full"
                style={{ width: '100%' }}
              ></div>
            </div>
            <span className="text-sm font-semibold text-emerald-500">100%</span>
          </div>
        </div>
        <div className="p-4 bg-muted/30 flex-grow">
          <h4 className="text-xs font-medium text-muted-foreground mb-3 px-2">Tópicos concluídos:</h4>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
            {subject.topics.map(topic => (
              <StudyCycleTopicItem
                key={topic.id}
                topic={topic}
                isMarkedInSession={false}
                onToggleMark={() => { }}
                onOpenNotes={() => onOpenNotes(subject.id, topic.id)}
                isSubjectFinished={true}
                isActionable={false}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className={`${cardBaseClasses} w-full ${focusClasses}`}>
        <button
          onClick={onToggleExpand}
          className="w-full flex items-center p-4 gap-4 text-left"
          aria-expanded={isExpanded}
          aria-controls={`topics-${subject.id}`}
        >
          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <h3 className="text-base text-card-foreground" style={{ fontWeight: 700 }}>{subject.name}</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSubjectNotesClick();
                }}
                className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
                title="Anotações da matéria"
              >
                <NotebookPen className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">{progress}%</span>
            </div>
          </div>
          <div className={`text-muted-foreground transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
            <ChevronDownIcon />
          </div>
        </button>
        {isExpanded && (
          <div id={`topics-${subject.id}`} className="p-4 pt-0">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="space-y-2">
                {subject.topics.map(topic => (
                  <StudyCycleTopicItem
                    key={topic.id}
                    topic={topic}
                    isMarkedInSession={markedTopicIds.has(topic.id)}
                    onToggleMark={onToggleMark}
                    onOpenNotes={() => onOpenNotes(subject.id, topic.id)}
                    isSubjectFinished={false}
                    isActionable={isActionable}
                  />
                ))}
              </div>
              {isActionable && (
                <div className="mt-4 pt-4 border-t border-border flex justify-end">
                  <button
                    onClick={handleComplete}
                    disabled={markedTopicIds.size === 0}
                    className="bg-sky-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:bg-sky-700 disabled:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground text-sm"
                  >
                    Concluir Sessão ({markedTopicIds.size})
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${cardBaseClasses} flex flex-col ${focusClasses}`}>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base text-card-foreground" style={{ fontWeight: 700 }}>{subject.name}</h3>
          <button
            onClick={onSubjectNotesClick}
            className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
            title="Anotações da matéria"
          >
            <NotebookPen className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <div className="w-full bg-muted rounded-full h-2.5">
            <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
          <span className="text-sm font-semibold text-muted-foreground">{progress}%</span>
        </div>
      </div>

      <div className="p-4 bg-muted/30 flex-grow flex flex-col">
        <div className="space-y-2 overflow-y-auto pr-2 flex-grow" style={{ maxHeight: '12rem' }}>
          {subject.topics.map(topic => (
            <StudyCycleTopicItem
              key={topic.id}
              topic={topic}
              isMarkedInSession={markedTopicIds.has(topic.id)}
              onToggleMark={onToggleMark}
              onOpenNotes={() => onOpenNotes(subject.id, topic.id)}
              isSubjectFinished={false}
              isActionable={isActionable}
            />
          ))}
        </div>
      </div>

      {isActionable && (
        <div className="p-4 bg-card border-t border-border mt-auto flex justify-end">
          <button
            onClick={handleComplete}
            disabled={markedTopicIds.size === 0}
            className="bg-sky-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:bg-sky-700 disabled:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground text-sm"
          >
            Concluir Sessão ({markedTopicIds.size})
          </button>
        </div>
      )}
    </div>
  );
};