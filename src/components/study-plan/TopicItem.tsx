
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { Topic } from '@/types';

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
  const getTopicReviewStage = (topic: Topic) => {
    if (!topic.reviewStage) return "Não Iniciado";
    return topic.reviewStage;
  };

  const reviewStage = getTopicReviewStage(topic);
  const isTopicCompleted = topic.reviewStage === 'Concluído';

  return (
    <motion.div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-2 rounded bg-white/60">
      <div className="flex flex-col gap-1 w-full">
        <span className="text-sm font-medium text-gray-800">{topic.name}</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
        <span className="text-xs px-2 py-1 rounded-lg bg-blue-100/80 text-blue-800 font-medium whitespace-nowrap">
          {reviewStage}
        </span>
        {!isMarkedForReview ? (
          <Button 
            variant="outline" 
            size="sm" 
            className="text-green-600 hover:text-green-800 border border-green-200 hover:bg-green-50 transition-colors text-xs px-2 py-1 h-7 min-w-[110px] w-full sm:w-auto"
            onClick={() => onMarkTopicForReview(subjectId, topic.id)}
            disabled={isTopicCompleted}
          >
            <Check className="h-3 w-3 mr-1" />
            Marcar Revisão
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="text-red-600 hover:text-red-800 border border-red-200 hover:bg-red-50 transition-colors text-xs px-2 py-1 h-7 min-w-[110px] w-full sm:w-auto"
            onClick={() => onCancelTopicReview(subjectId, topic.id)}
          >
            <X className="h-3 w-3 mr-1" />
            Cancelar
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default TopicItem;
