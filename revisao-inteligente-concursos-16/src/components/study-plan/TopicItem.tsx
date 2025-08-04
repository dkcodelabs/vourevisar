
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SubtopicsList } from '@/components/ui/subtopics-list';
import { X } from 'lucide-react';
import { Topic } from '@/types';
import NotesModal from '@/components/reviews/NotesModal';
import { CheckIcon } from './icons';

interface TopicItemProps {
  topic: Topic;
  subjectId: string;
  isMarkedForReview: boolean;
  onMarkTopicForReview: (subjectId: string, topicId: string) => void;
  onCancelTopicReview: (subjectId: string, topicId: string) => void;
}

const TopicItem: React.FC<TopicItemProps> = ({
  topic,
  subjectId,
  isMarkedForReview,
  onMarkTopicForReview,
  onCancelTopicReview
}) => {
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const getTopicReviewStage = (topic: Topic) => {
    // Log para debug
    console.log(`🔍 Tópico "${topic.name}":`, {
      reviewStage: topic.reviewStage,
      reviewCount: topic.reviewCount,
      completed: topic.completed
    });
    
    // Se não tem review_stage definido e nunca foi revisado, é "Não Iniciado"
    if (!topic.reviewStage && topic.reviewCount === 0) {
      return "Não Iniciado";
    }
    
    // Se tem reviewStage definido, usar ele
    if (topic.reviewStage) {
      return topic.reviewStage;
    }
    
    // Fallback para casos onde há contagem mas não há stage
    return topic.reviewCount > 0 ? "Em Revisão" : "Não Iniciado";
  };

  const reviewStage = getTopicReviewStage(topic);
  const isTopicCompleted = topic.reviewStage === 'Concluído';

  const handleMarkForReview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsNotesModalOpen(true);
  };

  const handleNotesClose = () => {
    setIsNotesModalOpen(false);
    // Apenas fecha o modal - não salva nem marca para revisão
  };

  const handleNotesSaved = () => {
    setIsNotesModalOpen(false);
    // Marca o tópico para revisão após salvar e fechar o modal
    onMarkTopicForReview(subjectId, topic.id);
  };

  const handleCancelReview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Canceling topic review:', topic.id, subjectId);
    onCancelTopicReview(subjectId, topic.id);
  };

  // Função para obter classes de status baseadas no estilo fornecido
  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'Concluído':
        return 'bg-gray-100 text-gray-600';
      case 'Em Revisão':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-sky-100 text-sky-800 border-sky-200';
    }
  };

  return (
    <>
      <div className="flex items-center justify-between py-3 px-4 transition-colors hover:bg-gray-50">
        <p className="text-sm font-medium text-gray-600 flex-1 min-w-0 pr-4 truncate">{topic.name}</p>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isTopicCompleted ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
              Concluído
            </span>
          ) : reviewStage === 'Em Revisão' || isMarkedForReview ? (
            <>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusClasses('Em Revisão')}`}>
                Em Revisão
              </span>
              <button 
                onClick={handleCancelReview}
                className="text-xs font-medium px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(reviewStage)}`}>
                {reviewStage}
              </span>
              <button 
                onClick={handleMarkForReview}
                className="flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1 rounded-md border border-green-200"
                disabled={topic.reviewCount > 0}
              >
                <CheckIcon className="w-4 h-4" /> 
                Marcar Revisão
              </button>
            </>
          )}
        </div>
      </div>

      <NotesModal
        isOpen={isNotesModalOpen}
        onClose={handleNotesClose}
        onSave={handleNotesSaved}
        topicId={topic.id}
        topicName={topic.name}
        subjectName="Matéria" 
      />
    </>
  );
};

export default TopicItem;
