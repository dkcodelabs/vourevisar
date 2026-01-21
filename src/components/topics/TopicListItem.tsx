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
    maxReviews?: number;
    last_search_context?: string | null;
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
    if (!topic.nextReview) return RevisionStatus.FUTURE;

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

  const getStatusColor = () => {
    switch (status) {
      case RevisionStatus.COMPLETED: return '#22c55e';
      case RevisionStatus.OVERDUE: return '#ef4444';
      case RevisionStatus.TODAY: return '#f97316';
      case RevisionStatus.FUTURE: return '#3b82f6';
      default: return '#cbd5e1';
    }
  };

  return (
    <div className="
      group relative border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors
      flex flex-col lg:grid lg:grid-cols-[1fr_100px_110px_160px_120px] lg:gap-0
    ">
      {/* Sticky Left Color Bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ backgroundColor: getStatusColor() }}
      ></div>

      {/* Mobile: Vertical layout */}
      <div className="lg:hidden px-4 pt-4">
        {/* Line 1: Subject name */}
        <div className="text-[11px] text-gray-500 font-normal capitalize mb-1">
          {topic.subjectName.toLowerCase()}
        </div>
        {/* Line 2: Topic name */}
        <div className="font-semibold text-gray-800 text-sm break-words whitespace-normal leading-tight transition-colors first-letter:uppercase mb-3">
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
              className="flex items-center gap-2 group/topic cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              title="Clique para editar"
            >
              <span>{topic.name}</span>
              {topic.isMarkedForReview && (
                <Bookmark className="h-3 w-3 text-yellow-600" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Desktop: Topic and Subject in same column */}
      <div className="hidden lg:flex lg:p-3 lg:flex-col lg:justify-center lg:pl-8 lg:border-r border-gray-100 min-w-0">
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
          <>
            <div
              className="font-semibold lg:font-medium text-gray-800 text-sm lg:text-xs break-words whitespace-normal leading-tight transition-colors first-letter:uppercase cursor-pointer hover:text-blue-600 flex items-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              title="Clique para editar"
            >
              <span>{topic.name}</span>
              {topic.isMarkedForReview && (
                <Bookmark className="h-3 w-3 text-yellow-600" />
              )}
            </div>
            <div className="text-xs text-gray-500 font-normal mt-0.5 lg:mt-1 break-words whitespace-normal capitalize">
              {topic.subjectName.toLowerCase()}
            </div>
          </>
        )}
      </div>

      {/* Mobile: Line 3 - All controls in one row, aligned right */}
      <div className="flex items-center justify-end gap-2 px-4 pb-4 lg:hidden">
        <div className="cursor-pointer">
          <DifficultyRating value={topic.difficulty_level || 0} readonly size="sm" />
        </div>
        <div className="w-[115px]">
          <StatusBadge
            status={status}
            daysDiff={daysDiff}
            reviewCount={topic.reviewCount}
            maxReviews={maxReviews}
          />
        </div>
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

      <div className="hidden lg:flex lg:p-0 lg:contents">
        <div className="lg:p-3 flex items-center lg:justify-center lg:border-r border-gray-100 cursor-pointer">
          <DifficultyRating value={topic.difficulty_level || 0} readonly size="sm" />
        </div>
      </div>

      {/* Desktop: Context Link/Badge */}
      <div className="hidden lg:flex lg:items-center lg:justify-center lg:border-r border-gray-100 lg:p-2">
        {topic.last_search_context ? (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${topic.last_search_context.includes("Global") || topic.last_search_context.includes("Broad")
              ? "bg-purple-50 text-purple-700 border-purple-100"
              : "bg-blue-50 text-blue-700 border-blue-100"
              }`}
            title={topic.last_search_context}
          >
            {topic.last_search_context.includes("Global") || topic.last_search_context.includes("Broad") ? "Global" : "Auto"}
          </span>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </div>

      {/* Desktop: Status & Actions */}
      <div className="hidden lg:flex lg:items-center lg:gap-3 lg:p-0 lg:contents">
        {/* Status */}
        <div className="md:px-1 md:py-1 flex items-center justify-center md:border-r border-gray-100">
          <div className="w-[115px]">
            <StatusBadge
              status={status}
              daysDiff={daysDiff}
              reviewCount={topic.reviewCount}
              maxReviews={maxReviews}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="md:p-2 flex items-center justify-center gap-2">
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
