import React, { useState } from 'react';
import type { StudyCycleTopic } from '@/types/study-cycle';
import { ReviewInterval } from '@/types/study-cycle';
import { CheckIcon } from './Icons';
import { FileText, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  [ReviewInterval.NOT_STARTED]: { 
    text: 'Não estudado', 
    className: 'bg-secondary text-content-muted border border-border/50' 
  },
  [ReviewInterval.FIRST_CONTACT]: { 
    text: 'Primeiro Contato', 
    className: 'bg-primary/10 text-primary border border-primary/20' 
  },
  [ReviewInterval.REVISED_24H]: { 
    text: 'Próxima: 24h', 
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' 
  },
  [ReviewInterval.REVISED_7D]: { 
    text: 'Próxima: 7d', 
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' 
  },
  [ReviewInterval.REVISED_15D]: { 
    text: 'Próxima: 15d', 
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' 
  },
  [ReviewInterval.REVISED_30D]: { 
    text: 'Próxima: 30d', 
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' 
  },
  [ReviewInterval.COMPLETED]: { 
    text: 'Concluído', 
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
  },
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
      className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
      dateInfo: `Em: ${formattedDate}`
    };
  };

  const navigate = useNavigate();
  const statusConfig = getTopicStatus();



  if (isSubjectFinished) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full px-4 py-2 gap-2">
        <span className="text-sm text-foreground flex-1 break-words leading-tight">
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
  const bgClasses = 'bg-card hover:bg-accent border border-border/50 dark:border-white/5 shadow-sm';

  const buttonBaseClasses = "flex-shrink-0 w-8 h-8 min-w-[2rem] min-h-[2rem] max-w-[2rem] max-h-[2rem] rounded-full flex items-center justify-center border-2 transition-all duration-200";

  return (
    <div data-topic-item className={`${baseClasses} ${bgClasses}`}>
      {/* Layout responsivo: mobile/tablet = vertical (texto em cima, controles embaixo), desktop = horizontal */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between w-full gap-2">
        {/* Texto do tópico - Editável */}
        <div className="flex-1 group min-w-0 flex items-center gap-2">
          {topic.position && (
            <span className="text-sm font-semibold text-content-muted w-6 text-right shrink-0">
              {topic.position}.
            </span>
          )}
          <div
            className="block flex-1 first-letter:uppercase"
          >
            <span className="text-sm font-normal text-zinc-800 dark:text-zinc-200 break-words block">
              <HighlightText text={topic.name} searchQuery={searchQuery} />
            </span>
          </div>
        </div>

        {/* Controles: status, anotação e radiobox */}
        <div className="flex items-center gap-3 flex-shrink-0 self-center">
          {/* Badge com data em tooltip */}
          <div className="flex flex-col items-center">
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
          {/* Action Button: Radio (Not Started) OR Link (Started) */}
          {topic.reviewStatus === ReviewInterval.NOT_STARTED ? (
            <button
              onClick={onCheckboxClick}
              disabled={isTopicCompleted || !isActionable}
              className={`flex-shrink-0 w-6 h-6 min-w-[1.5rem] min-h-[1.5rem] max-w-[1.5rem] max-h-[1.5rem] rounded-full flex items-center justify-center border-2 transition-all duration-200 border-border dark:border-white/20 shadow-sm bg-secondary hover:bg-accent ${(isTopicCompleted || !isActionable) ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={`Marcar ${topic.name} como revisado`}
            >
            </button>
          ) : (
            <button
              onClick={() => navigate(`/revisoes?topicId=${topic.id}`)}
              className="flex-shrink-0 w-6 h-6 min-w-[1.5rem] min-h-[1.5rem] max-w-[1.5rem] max-h-[1.5rem] rounded-full flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/40 transition-all duration-200 shadow-sm border border-indigo-200 dark:border-indigo-800"
              title="Ir para Revisões"
              aria-label={`Ver ${topic.name} em Revisões`}
            >
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};