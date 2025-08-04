
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Trash2 } from 'lucide-react';
import { Topic } from '@/types';
import RegisterQuestionsButton from '@/components/reviews/RegisterQuestionsButton';

interface TopicCardProps {
  topic: Topic & { subjectName: string };
  onDelete: (topicId: string) => void;
  onNotesClick: (topic: Topic & { subjectName: string }) => void;
}

const TopicCard: React.FC<TopicCardProps> = ({ topic, onDelete, onNotesClick }) => {
  const getStatusBadge = () => {
    if (topic.completed) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Completo</Badge>;
    }
    
    if (topic.reviewStage) {
      const now = new Date();
      const nextReview = topic.nextReview ? new Date(topic.nextReview) : null;
      
      if (nextReview && nextReview <= now) {
        return <Badge variant="destructive">Atrasado</Badge>;
      }
      
      if (nextReview) {
        const diffDays = Math.ceil((nextReview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) {
          return <Badge variant="default" className="bg-blue-100 text-blue-800">Hoje</Badge>;
        } else if (diffDays <= 7) {
          return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            Próxima: {String(nextReview.getDate()).padStart(2, '0')}/{String(nextReview.getMonth() + 1).padStart(2, '0')}
          </Badge>;
        } else {
          return <Badge variant="outline" className="bg-purple-100 text-purple-800">{topic.reviewStage}</Badge>;
        }
      }
      
      return <Badge variant="outline" className="bg-purple-100 text-purple-800">{topic.reviewStage}</Badge>;
    }
    
    return <Badge variant="outline">Novo</Badge>;
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-gray-900 truncate">{topic.name}</h3>
            {topic.notes && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNotesClick(topic)}
                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
              >
                <FileText className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-600">{topic.subjectName}</span>
            {getStatusBadge()}
          </div>

          {topic.reviewCount > 0 && (
            <p className="text-xs text-gray-500">
              {topic.reviewCount} revisão{topic.reviewCount !== 1 ? 'ões' : ''}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 ml-2">
          <RegisterQuestionsButton 
            subject={topic.subjectName} 
            topic={topic.name} 
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(topic.id)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TopicCard;
