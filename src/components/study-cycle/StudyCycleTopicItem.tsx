import React, { useState } from 'react';
import type { StudyCycleTopic } from '@/types/study-cycle';
import { ReviewInterval } from '@/types/study-cycle';
import { CheckIcon, EditIcon } from './Icons';
import { EditableTopicName } from '@/components/EditableTopicName';

interface StudyCycleTopicItemProps {
  topic: StudyCycleTopic;
  isMarkedInSession: boolean;
  onToggleMark: (topicId: string) => void;
  onOpenNotes: () => void;
  onTopicUpdate?: () => void;
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
  onTopicUpdate,
  isSubjectFinished,
  isActionable
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const isTopicCompleted = topic.reviewStatus === ReviewInterval.COMPLETED;
  const statusConfig = REVIEW_STATUS_CONFIG[topic.reviewStatus];

  if (isSubjectFinished) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full px-4 py-2 gap-2">
        <span className="text-sm text-zinc-800 dark:text-zinc-200 flex-1">{topic.name}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Revisado</span>
          <div className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
            <CheckIcon />
          </div>
        </div>
      </div>
    );
  }

  const baseClasses = "flex items-center justify-between w-full p-3 text-left transition-colors duration-200 rounded-lg";
  const bgClasses = 'bg-white dark:bg-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700';

  const buttonBaseClasses = "flex-shrink-0 w-8 h-8 min-w-[2rem] min-h-[2rem] max-w-[2rem] max-h-[2rem] rounded-full flex items-center justify-center border-2 transition-all duration-200";
  const buttonStateClasses = isMarkedInSession
    ? "bg-blue-600 border-blue-700 text-white shadow-md"
    : "border-gray-300 dark:border-slate-400 shadow-sm dark:bg-slate-600 dark:hover:bg-blue-900/20 dark:hover:border-blue-500"
    + " bg-[#F1F5F9] hover:bg-[#DBEAFE] hover:border-blue-400";

  return (
    <div className={`${baseClasses} ${bgClasses}`}>
      {/* Layout responsivo: desktop = horizontal, mobile = vertical */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3">
        {/* Texto do tópico - Editável */}
        <div 
          className="flex-1 cursor-pointer group"
          onClick={() => !isEditingName && setIsEditingName(true)}
          title="Clique para editar o nome"
        >
          <EditableTopicName
            topicId={topic.id}
            initialName={topic.name}
            onUpdate={() => {
              setIsEditingName(false);
              onTopicUpdate?.();
            }}
            isEditing={isEditingName}
            onEditChange={setIsEditingName}
          />
        </div>
        
        {/* Controles: status, anotação e radiobox */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusConfig.className}`}>
            {statusConfig.text}
          </span>
          <button
            onClick={onOpenNotes}
            className="p-1 text-gray-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 transition-colors"
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
    </div>
  );
};