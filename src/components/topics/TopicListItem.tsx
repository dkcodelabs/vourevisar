import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Check, X, FileText, Bookmark } from 'lucide-react';
import { format, isToday, isPast, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DifficultyRating } from '@/components/ui/difficulty-rating';
import { StatusBadge } from '@/components/reviews/new/StatusBadge';
import { RevisionStatus } from '@/types/revision';

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
    difficulty_level?: number;
    maxReviews?: number; // Add maxReviews to props if not present, or assume default
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

  const getStatus = (): RevisionStatus => {
    if (topic.completed) return RevisionStatus.COMPLETED;
    if (!topic.nextReview) return RevisionStatus.FUTURE; // Or handle 'No Review' separately if needed, but StatusBadge might expect enum

    const reviewDate = new Date(topic.nextReview);
    if (isPast(reviewDate) && !isToday(reviewDate)) return RevisionStatus.OVERDUE;
    if (isToday(reviewDate)) return RevisionStatus.TODAY;
    return RevisionStatus.FUTURE;
  };

  const getDaysDiff = () => {
    if (!topic.nextReview) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(topic.nextReview);
    target.setHours(0, 0, 0, 0);
    return differenceInCalendarDays(target, today);
  };

  const status = getStatus();
  const daysDiff = getDaysDiff();

  // Default maxReviews if not provided (assuming 4 based on typical spaced repetition)
  const maxReviews = topic.maxReviews || 4;

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

  const hasNotes = topic.notes && topic.notes.content && topic.notes.content.trim().length > 0;

  return (
    <div className="
      group relative border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors
      flex flex-col md:grid md:grid-cols-[1fr_340px_100px_160px_120px] md:gap-0
    ">
      {/* Sticky Left Color Bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ backgroundColor: topic.subjectColor || '#e5e7eb' }}
      ></div>

      {/* Topic Column */}
      <div className="
          md:p-3 flex items-center gap-3 pl-4 md:pl-8
          pt-4 md:pt-3 md:border-r border-gray-100
        ">
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
            <div
              className="flex items-center gap-2 group/topic"
              title="Clique no texto para editar"
            >
              <h3
                className="font-semibold md:font-medium text-gray-800 text-sm md:text-xs truncate group-hover/topic:text-blue-600 transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
              >
                {topic.name}
              </h3>
              {topic.isMarkedForReview && (
                <Bookmark className="h-3 w-3 text-yellow-600" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Subject & Difficulty */}
      <div className="flex items-center px-4 pb-2 md:p-0 md:contents">
        {/* Subject */}
        <div className="md:p-3 flex items-center md:justify-center md:border-r border-gray-100 mr-4 md:mr-0">
          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[10px] font-medium text-center max-w-full block line-clamp-2">
            {topic.subjectName}
          </span>
        </div>

        {/* Difficulty */}
        <div className="md:p-3 flex items-center md:justify-center md:border-r border-gray-100">
          <DifficultyRating value={topic.difficulty_level || 0} readonly size="sm" />
        </div>
      </div>

      {/* Status & Actions */}
      <div className="flex items-center gap-3 px-4 pb-4 md:p-0 md:contents">
        {/* Status */}
        <div className="md:px-1 md:py-1 flex items-center justify-center md:border-r border-gray-100">
          <div className="w-[115px] flex justify-center">
            <StatusBadge
              status={status}
              daysDiff={daysDiff}
              reviewCount={topic.reviewCount}
              maxReviews={maxReviews}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="md:p-2 flex items-center justify-end md:justify-center gap-2">
          {!isEditing && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleNotesClick}
                className={`h-8 w-8 p-0 ${hasNotes ? 'text-blue-600 hover:text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
                title={hasNotes ? "Ver/Editar Nota" : "Adicionar Nota"}
              >
                <FileText className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(topic.id)}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                title="Excluir Tópico"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopicListItem;
