import React, { useMemo } from 'react';
import type { StudyCycleSubject } from '@/types/study-cycle';
import { ReviewInterval } from '@/types/study-cycle';
import { StudyCycleTopicItem } from './StudyCycleTopicItem';
import { ChevronDownIcon } from './Icons';

interface StudyCycleSubjectCardProps {
  subject: StudyCycleSubject;
  onCompleteSession: (subjectId: string) => void;
  onOpenNotes: (subjectId: string, topicId: string) => void;
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

  const cardBaseClasses = "bg-white dark:bg-slate-800 rounded-2xl shadow-md overflow-hidden transition-all duration-300";
  const focusClasses = isStudyFocus
    ? 'relative transform scale-[1.03] shadow-[0_0_20px_rgba(14,165,233,0.2)] dark:shadow-[0_0_20px_rgba(56,189,248,0.15)] z-10'
    : '';

  if (isFullyCompleted) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md overflow-hidden flex flex-col">
        <div className="p-6">
          <h3 className="title-card text-gray-900 dark:text-slate-100">{subject.name}</h3>
          <div className="flex items-center gap-4 mt-4">
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
              <div
                className="bg-emerald-500 h-2.5 rounded-full"
                style={{ width: '100%' }}
              ></div>
            </div>
            <span className="text-sm font-semibold text-emerald-500">100%</span>
          </div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 flex-grow">
          <h4 className="text-base font-semibold text-gray-700 dark:text-slate-300 mb-3 px-2">Tópicos concluídos:</h4>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
            {subject.topics.map(topic => (
              <StudyCycleTopicItem
                key={topic.id}
                topic={topic}
                isMarkedInSession={false}
                onToggleMark={() => {}}
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
            <div className="flex items-center gap-3">
              <h3 className="title-card text-gray-900 dark:text-slate-100">{subject.name}</h3>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-slate-400">{progress}%</span>
            </div>
          </div>
          <div className={`text-gray-500 dark:text-slate-400 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
            <ChevronDownIcon />
          </div>
        </button>
        {isExpanded && (
          <div id={`topics-${subject.id}`} className="p-4 pt-0">
            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
              <h4 className="text-base font-semibold text-gray-700 dark:text-slate-300 mb-3 px-2">Tópicos para revisar:</h4>
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
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <button
                    onClick={handleComplete}
                    disabled={markedTopicIds.size === 0}
                    className="w-full bg-sky-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 hover:bg-sky-700 disabled:bg-gray-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-gray-500 dark:disabled:text-slate-500"
                  >
                    Concluir Sessão ({markedTopicIds.size} {markedTopicIds.size === 1 ? 'tópico' : 'tópicos'})
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
        <div className="flex items-center gap-3">
          <h3 className="title-card text-gray-900 dark:text-slate-100">{subject.name}</h3>
        </div>
        <div className="flex items-center gap-4 mt-4">
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
            <span className="text-sm font-semibold text-gray-600 dark:text-slate-400">{progress}%</span>
        </div>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-slate-800/50 flex-grow flex flex-col">
        <h4 className="text-base font-semibold text-gray-700 dark:text-slate-300 mb-3 px-2 flex-shrink-0">Tópicos para revisar:</h4>
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
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 mt-auto">
          <button
            onClick={handleComplete}
            disabled={markedTopicIds.size === 0}
            className="w-full bg-sky-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 hover:bg-sky-700 disabled:bg-gray-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-gray-500 dark:disabled:text-slate-500"
          >
            Concluir Sessão ({markedTopicIds.size} {markedTopicIds.size === 1 ? 'tópico' : 'tópicos'})
          </button>
        </div>
      )}
    </div>
  );
};