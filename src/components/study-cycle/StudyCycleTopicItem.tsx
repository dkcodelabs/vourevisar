import React from 'react';
import type { StudyCycleTopic } from '@/types/study-cycle';
import { ReviewInterval } from '@/types/study-cycle';
import { CheckIcon, EditIcon } from './Icons';

interface StudyCycleTopicItemProps {
  topic: StudyCycleTopic;
  isMarkedInSession: boolean;
  onToggleMark: (topicId: string) => void;
  onOpenNotes: () => void;
  isSubjectFinished: boolean;
  isActionable: boolean;
}

const REVIEW_STATUS_CONFIG: Record<ReviewInterval, { text: string; className: string }> = {
  [ReviewInterval.NOT_STARTED]: { text: 'Não estudado', className: 'bg-gray-200 text-gray-600 dark:bg-slate-600 dark:text-slate-300' },
  [ReviewInterval.REVISED_24H]: { text: 'Próxima: 24h', className: 'bg-blue-200 text-blue-800 dark:bg-blue-800/50 dark:text-blue-300' },
  [ReviewInterval.REVISED_7D]: { text: 'Próxima: 7d', className: 'bg-purple-200 text-purple-800 dark:bg-purple-800/50 dark:text-purple-300' },
  [ReviewInterval.REVISED_15D]: { text: 'Próxima: 15d', className: 'bg-purple-200 text-purple-800 dark:bg-purple-800/50 dark:text-purple-300' },
  [ReviewInterval.REVISED_30D]: { text: 'Próxima: 30d', className: 'bg-red-200 text-red-800 dark:bg-red-800/50 dark:text-red-300' },
  [ReviewInterval.COMPLETED]: { text: 'Concluído', className: 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800/50 dark:text-emerald-300' },
};

export const StudyCycleTopicItem: React.FC<StudyCycleTopicItemProps> = ({
  topic,
  isMarkedInSession,
  onToggleMark,
  onOpenNotes,
  isSubjectFinished,
  isActionable
}) => {
  const isTopicCompleted = topic.reviewStatus === ReviewInterval.COMPLETED;
  const statusConfig = REVIEW_STATUS_CONFIG[topic.reviewStatus];

  if (isSubjectFinished) {
    return (
      <div className="flex items-center justify-between w-full px-4 py-2">
        <span className="text-sm text-zinc-800 dark:text-zinc-200">{topic.name}</span>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Revisado</span>
          <div className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500 text-white">
            <CheckIcon />
          </div>
        </div>
      </div>
    );
  }

  const baseClasses = "flex items-center justify-between w-full p-3 text-left transition-colors duration-200 rounded-lg";
  const bgClasses = 'bg-white dark:bg-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700';

  const buttonBaseClasses = "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-200";
  const buttonStateClasses = isMarkedInSession
    ? "bg-sky-500 border-sky-600 text-white"
    : "bg-gray-50 dark:bg-slate-700 border-gray-400 dark:border-slate-500 hover:bg-sky-100 dark:hover:bg-sky-800 hover:border-sky-400";

  return (
    <div className={`${baseClasses} ${bgClasses}`}>
      <span className="text-sm text-zinc-800 dark:text-zinc-200">{topic.name}</span>
      <div className="flex items-center gap-3">
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusConfig.className}`}>
          {statusConfig.text}
        </span>
        <button
          onClick={onOpenNotes}
          className="p-1 text-gray-400 hover:text-sky-500 dark:text-slate-500 dark:hover:text-sky-400 transition-colors"
          aria-label={`Anotações para ${topic.name}`}
        >
          <EditIcon />
        </button>
        <button
          onClick={() => onToggleMark(topic.id)}
          disabled={isTopicCompleted || !isActionable}
          className={`${buttonBaseClasses} ${buttonStateClasses} ${(isTopicCompleted || !isActionable) ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={`Marcar ${topic.name} como revisado`}
        >
          {isMarkedInSession && <CheckIcon />}
        </button>
      </div>
    </div>
  );
};