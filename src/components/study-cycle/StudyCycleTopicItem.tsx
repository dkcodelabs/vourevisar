import React, { useState } from 'react';
import type { StudyCycleTopic } from '@/types/study-cycle';
import { ReviewInterval } from '@/types/study-cycle';
import { CheckIcon } from './Icons';
import { FileText } from 'lucide-react';
import { EditableTopicName } from '@/components/EditableTopicName';

interface StudyCycleTopicItemProps {
  topic: StudyCycleTopic;
  onCheckboxClick: () => void;
  onOpenNotes: () => void;
  onTopicUpdate?: () => void;
  isSubjectFinished: boolean;
  isActionable: boolean;
  isEditing?: boolean;
  onEditingChange?: (topicId: string | null) => void;
  searchQuery?: string;
}

// Componente para destacar texto da busca
const HighlightText: React.FC<{ text: string; searchQuery: string }> = ({ text, searchQuery }) => {
  if (!searchQuery.trim()) return <>{text}</>;

  const normalizeText = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(searchQuery);

  const index = normalizedText.indexOf(normalizedQuery);

  if (index === -1) return <>{text}</>;

  const beforeMatch = text.substring(0, index);
  const match = text.substring(index, index + searchQuery.length);
  const afterMatch = text.substring(index + searchQuery.length);

  return (
    <>
      {beforeMatch}
      <mark className="bg-yellow-200 dark:bg-yellow-600 text-gray-900 dark:text-gray-100 px-0.5 rounded">
        {match}
      </mark>
      {afterMatch}
    </>
  );
};

const REVIEW_STATUS_CONFIG: Record<ReviewInterval, { text: string; className: string }> = {
  [ReviewInterval.NOT_STARTED]: { text: 'Não estudado', className: 'bg-gray-200 text-gray-700 dark:bg-slate-600 dark:text-slate-300' },
  [ReviewInterval.FIRST_CONTACT]: { text: 'Primeiro Contato', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  [ReviewInterval.REVISED_24H]: { text: 'Próxima: 24h', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  [ReviewInterval.REVISED_7D]: { text: 'Próxima: 7d', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  [ReviewInterval.REVISED_15D]: { text: 'Próxima: 15d', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  [ReviewInterval.REVISED_30D]: { text: 'Próxima: 30d', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  [ReviewInterval.COMPLETED]: { text: 'Concluído', className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
};

export const StudyCycleTopicItem: React.FC<StudyCycleTopicItemProps> = ({
  topic,
  onCheckboxClick,
  onOpenNotes,
  onTopicUpdate,
  isSubjectFinished,
  isActionable,
  isEditing = false,
  onEditingChange,
  searchQuery = ''
}) => {
  const isTopicCompleted = topic.reviewStatus === ReviewInterval.COMPLETED;

  // Calcular status baseado na data de próxima revisão
  const getTopicStatus = () => {

    if (isTopicCompleted) {
      // Para tópicos concluídos, mostrar a data da última revisão
      const completedDate = topic.lastReviewedAt
        ? new Date(topic.lastReviewedAt).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
        : null;

      return {
        text: 'Concluído',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        dateInfo: completedDate ? `Em: ${completedDate}` : null
      };
    }

    if (topic.reviewStatus === ReviewInterval.NOT_STARTED) {
      return {
        text: 'Não estudado',
        className: 'bg-gray-200 text-gray-700 dark:bg-slate-600 dark:text-slate-300',
        dateInfo: null
      };
    }

    if (topic.reviewStatus === ReviewInterval.FIRST_CONTACT) {
      // Para primeiro contato, calcular dias até a primeira revisão
      if (topic.nextReviewDate) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const nextReview = new Date(topic.nextReviewDate);
        const nextReviewDate = new Date(nextReview.getFullYear(), nextReview.getMonth(), nextReview.getDate());

        const diffTime = nextReviewDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const formattedDate = nextReview.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });

        // Atrasada (vermelho)
        if (diffDays < 0) {
          const daysOverdue = Math.abs(diffDays);
          return {
            text: `${daysOverdue} dia${daysOverdue !== 1 ? 's' : ''} atraso`,
            className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
            dateInfo: `Em: ${formattedDate}`
          };
        }

        // Hoje (laranja)
        if (diffDays === 0) {
          return {
            text: 'Hoje',
            className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
            dateInfo: `Em: ${formattedDate}`
          };
        }

        // Futura (roxo para primeiro contato)
        return {
          text: `Em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`,
          className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
          dateInfo: `Em: ${formattedDate}`
        };
      }

      return {
        text: 'Primeiro Contato',
        className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
        dateInfo: null
      };
    }

    // Verificar se tem data de próxima revisão
    if (!topic.nextReviewDate) {
      return {
        text: REVIEW_STATUS_CONFIG[topic.reviewStatus].text,
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        dateInfo: null
      };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextReview = new Date(topic.nextReviewDate);
    const nextReviewDate = new Date(nextReview.getFullYear(), nextReview.getMonth(), nextReview.getDate());

    const diffTime = nextReviewDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const formattedDate = nextReview.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Atrasada (vermelho)
    if (diffDays < 0) {
      const daysOverdue = Math.abs(diffDays);
      return {
        text: `${daysOverdue} dia${daysOverdue !== 1 ? 's' : ''} atraso`,
        className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        dateInfo: `Em: ${formattedDate}`
      };
    }

    // Hoje (laranja)
    if (diffDays === 0) {
      return {
        text: 'Hoje',
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
        dateInfo: `Em: ${formattedDate}`
      };
    }

    // Futura (azul)
    return {
      text: `Em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`,
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      dateInfo: `Em: ${formattedDate}`
    };
  };

  const statusConfig = getTopicStatus();

  const handleStartEditing = () => {
    onEditingChange?.(topic.id);
  };

  const handleStopEditing = () => {
    onEditingChange?.(null);
    onTopicUpdate?.();
  };

  if (isSubjectFinished) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full px-4 py-2 gap-2">
        <span className="text-sm text-zinc-800 dark:text-zinc-200 flex-1 break-words leading-tight">
          <HighlightText text={topic.name} searchQuery={searchQuery} />
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Revisado</span>
          <div className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
            <CheckIcon />
          </div>
        </div>
      </div>
    );
  }

  const baseClasses = "flex items-center justify-between w-full py-2 px-3 text-left transition-colors duration-200 rounded-lg";
  const bgClasses = 'bg-white dark:bg-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700';

  const buttonBaseClasses = "flex-shrink-0 w-8 h-8 min-w-[2rem] min-h-[2rem] max-w-[2rem] max-h-[2rem] rounded-full flex items-center justify-center border-2 transition-all duration-200";

  return (
    <div className={`${baseClasses} ${bgClasses}`}>
      {/* Layout responsivo: desktop = horizontal, mobile = vertical */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
        {/* Texto do tópico - Editável */}
        <div className="flex-1 group">
          <div
            className="inline-block cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (!isEditing) handleStartEditing();
            }}
            title="Clique no texto para editar"
          >
            <EditableTopicName
              topicId={topic.id}
              initialName={topic.name}
              onUpdate={handleStopEditing}
              isEditing={isEditing}
              onEditChange={(editing) => {
                if (!editing) {
                  handleStopEditing();
                }
              }}
              searchQuery={searchQuery}
            />
          </div>
        </div>

        {/* Controles: status, anotação e radiobox */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Badge com data em tooltip */}
          <div className="flex flex-col items-end">
            <div
              className={`px-2 py-0.5 rounded-full ${statusConfig.className} relative group cursor-help text-[11px] font-semibold`}
              title={statusConfig.dateInfo || ''}
            >
              {statusConfig.text}
              {/* Tooltip para desktop - aparece no hover */}
              {statusConfig.dateInfo && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {statusConfig.dateInfo}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onOpenNotes}
            className={`p-1 transition-colors ${topic.notes && topic.notes.trim() !== '' && topic.notes !== '<p><br></p>'
              ? 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
              : 'text-gray-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400'
              }`}
            aria-label={`Anotações para ${topic.name}`}
          >
            <FileText size={18} />
          </button>
          <button
            onClick={onCheckboxClick}
            disabled={isTopicCompleted || !isActionable}
            className={`flex-shrink-0 w-6 h-6 min-w-[1.5rem] min-h-[1.5rem] max-w-[1.5rem] max-h-[1.5rem] rounded-full flex items-center justify-center border-2 transition-all duration-200 border-gray-300 dark:border-slate-400 shadow-sm dark:bg-slate-600 dark:hover:bg-blue-900/20 dark:hover:border-blue-500 bg-[#F1F5F9] hover:bg-[#DBEAFE] hover:border-blue-400 ${(isTopicCompleted || !isActionable) ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={`Marcar ${topic.name} como revisado`}
          >
          </button>
        </div>
      </div>
    </div>
  );
};