
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SubtopicsList } from '@/components/ui/subtopics-list';
import { Check, X } from 'lucide-react';
import { Topic } from '@/types';
import NotesModal from '@/components/reviews/NotesModal';

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
    // Trigger refresh by calling mark for review after saving
    onMarkTopicForReview(subjectId, topic.id);
  };

  const handleCancelReview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Canceling topic review:', topic.id, subjectId);
    onCancelTopicReview(subjectId, topic.id);
  };

  return (
    <>
      <motion.div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-2 rounded bg-white/60">
        <div className="flex flex-col gap-1 w-full">
          <span className="text-sm font-medium text-gray-800">{topic.name}</span>
          <SubtopicsList subtopics={topic.subtopics || []} style="badges" />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
          <span className="text-xs px-2 py-1 rounded-lg bg-blue-100/80 text-blue-800 font-medium whitespace-nowrap">
            {reviewStage}
          </span>
          {isMarkedForReview ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="text-red-600 hover:text-red-800 border border-red-200 hover:bg-red-50 transition-colors text-xs px-2 py-1 h-7 min-w-[110px] w-full sm:w-auto"
              onClick={handleCancelReview}
              type="button"
            >
              <X className="h-3 w-3 mr-1" />
              Cancelar
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="text-green-600 hover:text-green-800 border border-green-200 hover:bg-green-50 transition-colors text-xs px-2 py-1 h-7 min-w-[110px] w-full sm:w-auto"
              onClick={handleMarkForReview}
              type="button"
              disabled={topic.reviewCount > 0}
            >
              <Check className="h-3 w-3 mr-1" />
              {topic.reviewCount > 0 ? 'Em Revisão' : 'Marcar Revisão'}
            </Button>
          )}
        </div>
      </motion.div>

      <NotesModal
        isOpen={isNotesModalOpen}
        onClose={handleNotesClose}
        topicId={topic.id}
        topicName={topic.name}
        subjectName="Matéria" 
      />
    </>
  );
};

export default TopicItem;
