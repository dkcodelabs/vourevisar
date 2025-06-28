
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit2, Trash2, Check, X, FileText, Bookmark } from 'lucide-react';
import { format, isToday, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TopicListItemProps {
  topic: {
    id: string;
    name: string;
    subjectName: string;
    subjectColor?: string;
    nextReview: string | null;
    reviewCount: number;
    completed: boolean;
    reviewStage?: string;
    notes?: any;
    isMarkedForReview?: boolean;
  };
  onEdit: (topicId: string, newName: string) => void;
  onDelete: (topicId: string) => void;
  onOpenNotes?: (topicId: string, topicName: string, subjectName: string) => void;
}

const TopicListItem: React.FC<TopicListItemProps> = ({
  topic,
  onEdit,
  onDelete,
  onOpenNotes
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(topic.name);

  const getStatusInfo = () => {
    if (topic.completed) {
      return { status: 'Concluído', color: 'bg-blue-100 text-blue-800', bgColor: 'bg-blue-50' };
    }
    
    if (!topic.nextReview) {
      return { status: 'Sem revisão', color: 'bg-gray-100 text-gray-800', bgColor: 'bg-gray-50' };
    }

    const reviewDate = new Date(topic.nextReview);
    
    if (isPast(reviewDate) && !isToday(reviewDate)) {
      return { 
        status: `Atrasado (${format(reviewDate, 'dd/MM', { locale: ptBR })})`, 
        color: 'bg-red-100 text-red-800', 
        bgColor: 'bg-red-50' 
      };
    }
    
    if (isToday(reviewDate)) {
      return { 
        status: 'Hoje', 
        color: 'bg-yellow-100 text-yellow-800', 
        bgColor: 'bg-yellow-50' 
      };
    }
    
    return { 
      status: format(reviewDate, 'dd/MM/yyyy', { locale: ptBR }), 
      color: 'bg-green-100 text-green-800', 
      bgColor: 'bg-green-50' 
    };
  };

  const getReviewStageInfo = () => {
    if (!topic.reviewStage) return null;
    
    const stageColors = {
      '24h': 'bg-orange-100 text-orange-800',
      '7d': 'bg-purple-100 text-purple-800', 
      '7 dias': 'bg-purple-100 text-purple-800',
      '15d': 'bg-indigo-100 text-indigo-800',
      '15 dias': 'bg-indigo-100 text-indigo-800',
      '30d': 'bg-green-100 text-green-800',
      '30 dias': 'bg-green-100 text-green-800',
      'Concluído': 'bg-blue-100 text-blue-800'
    };

    return {
      stage: topic.reviewStage,
      color: stageColors[topic.reviewStage as keyof typeof stageColors] || 'bg-gray-100 text-gray-800'
    };
  };

  const handleSaveEdit = () => {
    if (editName.trim() && editName !== topic.name) {
      onEdit(topic.id, editName.trim());
    }
    setIsEditing(false);
    setEditName(topic.name);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(topic.name);
  };

  const handleNotesClick = () => {
    if (onOpenNotes) {
      onOpenNotes(topic.id, topic.name, topic.subjectName);
    }
  };

  const statusInfo = getStatusInfo();
  const reviewStageInfo = getReviewStageInfo();
  const hasNotes = topic.notes && topic.notes.content && topic.notes.content.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`p-4 rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 ${statusInfo.bgColor} backdrop-blur-md`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            {topic.subjectColor && (
              <div 
                className="w-1 h-8 rounded-full"
                style={{ backgroundColor: topic.subjectColor }}
              />
            )}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveEdit}
                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 text-lg truncate">
                    {topic.name}
                  </h3>
                  {topic.isMarkedForReview && (
                    <Bookmark className="h-4 w-4 text-yellow-600" title="Marcado para revisão" />
                  )}
                </div>
              )}
              <p className="text-sm text-gray-600 truncate">{topic.subjectName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>Revisões: {topic.reviewCount}</span>
            {reviewStageInfo && (
              <Badge className={reviewStageInfo.color} variant="outline">
                {reviewStageInfo.stage}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge className={statusInfo.color}>
            {statusInfo.status}
          </Badge>
          
          {!isEditing && (
            <>
              {/* Botão de Anotações */}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleNotesClick}
                className={`h-8 w-8 p-0 ${hasNotes ? 'text-blue-600 hover:text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
                title={hasNotes ? 'Tem anotações - Clique para editar' : 'Adicionar anotações'}
              >
                <FileText className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(topic.id)}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TopicListItem;
