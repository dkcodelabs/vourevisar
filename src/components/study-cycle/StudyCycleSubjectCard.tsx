import React, { useMemo, useState } from 'react';
import type { StudyCycleSubject } from '@/types/study-cycle';
import { ReviewInterval } from '@/types/study-cycle';
import { StudyCycleTopicItem } from './StudyCycleTopicItem';
import { ChevronDownIcon } from './Icons';
import { NotebookPen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CycleStatusIndicator } from '@/components/CycleStatusIndicator';
import { Badge } from '@/components/ui/badge';
import { useCycleStatus } from '@/hooks/useCycleStatus';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';
import { MentorAlert } from '@/types/mentor';
import { MentorBadge } from '@/components/mentor/MentorBadge';

interface StudyCycleSubjectCardProps {
  subject: StudyCycleSubject;
  onCompleteSession: (subjectId: string) => void;
  onOpenNotes: (subjectId: string, topicId: string) => void;
  onSubjectNotesClick: () => void;
  onTopicUpdate?: () => void;
  isActionable: boolean;
  isStudyFocus: boolean;
  viewMode: 'grid' | 'list';
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCheckboxClick: (topicId: string) => void;
  cyclePosition?: number | null;
  searchQuery?: string;
  filterTopicsBySearch?: (topics: any[]) => any[];
  mentorAlert?: MentorAlert;
  criticalByTopic?: Map<string, MentorAlert>;
  gargaloByTopic?: Map<string, MentorAlert>;
  consolidatedTopicIds?: Set<string>;
}

const reviewProgression = [
  ReviewInterval.NOT_STARTED,
  ReviewInterval.REVISED_24H,
  ReviewInterval.REVISED_7D,
  ReviewInterval.REVISED_15D,
  ReviewInterval.REVISED_30D,
  ReviewInterval.COMPLETED,
];

export const StudyCycleSubjectCard: React.FC<StudyCycleSubjectCardProps> = ({
  subject,
  onCompleteSession,
  onOpenNotes,
  onSubjectNotesClick,
  onTopicUpdate,
  isActionable,
  isStudyFocus,
  viewMode,
  isExpanded,
  onToggleExpand,
  onCheckboxClick,
  cyclePosition,
  searchQuery = '',
  filterTopicsBySearch,
  mentorAlert,
  criticalByTopic,
  gargaloByTopic,
  consolidatedTopicIds
}) => {
  const { isSubjectStudied, getNextSuggestedSubject, markSubjectAsStudied, isNextSuggested } = useCycleStatus();
  const { user } = useAuth();
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const isFullyCompleted = useMemo(() => subject.topics.every(t => t.reviewStatus === ReviewInterval.COMPLETED), [subject.topics]);

  // Componente para renderizar a posição no ciclo
  const CyclePositionBadge = () => {
    if (!cyclePosition) return null;

    return (
      <Badge
        variant="secondary"
        className="bg-primary/10 text-primary border border-primary/20 font-mono text-xs min-w-[2.5rem] justify-center font-semibold"
        title={`Posição ${cyclePosition} na sequência do ciclo`}
      >
        {cyclePosition}
      </Badge>
    );
  };

  const progressStats = useMemo(() => {
    const total = subject.topics.length;
    if (total === 0) return { started: 0, completed: 0 };

    // Topics that have moved beyond NOT_STARTED
    const startedCount = subject.topics.filter(t => t.reviewStatus !== ReviewInterval.NOT_STARTED).length;
    // Topics that are fully COMPLETED
    const completedCount = subject.topics.filter(t => t.reviewStatus === ReviewInterval.COMPLETED).length;

    return {
      started: Math.round((startedCount / total) * 100),
      completed: Math.round((completedCount / total) * 100)
    };
  }, [subject.topics]);

  const handleComplete = async () => {
    try {
      console.log('🔵 handleComplete iniciado:', {
        subjectId: subject.id,
        originalId: subject.originalId,
        subjectName: subject.name
      });

      // 1. Executar a função original primeiro (marcar tópicos como revisados)
      await onCompleteSession(subject.id);

      // 2. Marcar como estudada no ciclo
      const originalId = subject.originalId || subject.id;
      const success = await markSubjectAsStudied(originalId, subject.name);

      if (success) {
        console.log('✅ Matéria marcada como estudada com sucesso');

        // Disparar apenas um evento para evitar loops infinitos
        window.dispatchEvent(new CustomEvent('cycleUpdated', {
          detail: {
            subjectId: originalId,
            subjectName: subject.name,
            completed: true
          }
        }));
      }

      console.log('✅ handleComplete concluído');
    } catch (error) {
      console.error('Erro ao completar sessão:', error);
    }
  };



  const cardBaseClasses = `bg-card rounded-2xl shadow-md overflow-hidden transition-all duration-300 ${isFullyCompleted ? 'opacity-60 grayscale-[0.5] hover:opacity-80 hover:grayscale-0' : ''}`;
  const focusClasses = isStudyFocus
    ? 'relative transform scale-[1.03] shadow-[0_0_20px_rgba(14,165,233,0.2)] dark:shadow-[0_0_20px_rgba(56,189,248,0.15)] z-10'
    : '';

  if (isFullyCompleted && viewMode === 'grid') {
    return (
      <div data-subject-id={subject.id} className="bg-card rounded-2xl shadow-md overflow-hidden flex flex-col">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <CyclePositionBadge />
              <h3 className="text-sm font-semibold text-card-foreground line-clamp-2">{subject.name.replace(/(\d+ª) visualização/g, '$1')}</h3>
              {mentorAlert && (
                <MentorBadge alert={mentorAlert} />
              )}
              {isFullyCompleted && (
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 py-0 px-1.5 h-5 shrink-0">
                  Concluída
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 relative">
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden relative shadow-inner">
              {/* Layer 1: Started (Gray/Phantom) - "In Pipeline" */}
              <div
                className="absolute top-0 left-0 h-full bg-content-muted/30 transition-all duration-700 ease-out rounded-r-full"
                style={{ width: `${progressStats.started}%` }}
              />

              {/* Layer 2: Completed (Emerald) - "Done" */}
              <div
                className="absolute top-0 left-0 h-full bg-emerald-600 transition-all duration-700 ease-out rounded-r-full"
                style={{ width: `${progressStats.completed}%` }}
              />
            </div>

            {/* Stats */}
            <div className="flex flex-col items-end min-w-[3rem]">
              <span className="text-sm font-bold text-foreground">{progressStats.completed}%</span>
              {progressStats.started > progressStats.completed && (
                <span className="text-[10px] text-content-muted font-medium whitespace-nowrap">
                  {progressStats.started}% iniciado
                </span>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <button
                onClick={onSubjectNotesClick}
                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
                title="Anotações da matéria"
              >
                <NotebookPen className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="p-4 bg-secondary/30 flex-grow">
          <h4 className="text-xs font-medium text-content-muted mb-3 px-2">Tópicos concluídos:</h4>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
            {(() => {
              const topics = filterTopicsBySearch ? filterTopicsBySearch(subject.topics) : subject.topics;
              // Ordenar por data de criação (antigos primeiro) para garantir sequência de cadastro
              // Tópicos novos ficam no fim.
              const sortedTopics = [...topics].sort((a, b) => {
                if (a.position !== undefined && b.position !== undefined) {
                  return a.position - b.position;
                }
                if (!a.createdAt && !b.createdAt) return 0;
                if (!a.createdAt) return 1;
                if (!b.createdAt) return -1;
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              });

              return sortedTopics.map(topic => (
                <StudyCycleTopicItem
                  key={topic.id}
                  topic={topic}
                  onCheckboxClick={() => onCheckboxClick(topic.id)}
                  onOpenNotes={() => onOpenNotes(subject.id, topic.id)}
                  onTopicUpdate={onTopicUpdate}
                  isSubjectFinished={true}
                  isActionable={false}
                  isEditing={editingTopicId === topic.id}
                  onEditingChange={setEditingTopicId}
                  searchQuery={searchQuery}
                  isConsolidated={consolidatedTopicIds?.has(topic.id) || false}
                />
              ));
            })()}

          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div data-subject-id={subject.id} className={`${cardBaseClasses} w-full ${focusClasses}`}>
        <div className="w-full flex items-center p-4 gap-4">
          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-1 min-w-0 pr-4">
                <CyclePositionBadge />
                <h3 className="text-sm font-semibold text-card-foreground break-words leading-tight">{subject.name.replace(/(\d+ª) visualização/g, '$1')}</h3>
                {mentorAlert && (
                  <MentorBadge alert={mentorAlert} />
                )}
                {isFullyCompleted && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 py-0 px-1.5 h-5 shrink-0">
                    Concluída
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden relative shadow-inner">
                {/* Layer 1: Started (Gray) */}
                <div
                  className="absolute top-0 left-0 h-full bg-content-muted/30 transition-all duration-700 ease-out rounded-r-full"
                  style={{ width: `${progressStats.started}%` }}
                />

                {/* Layer 2: Completed (Emerald) */}
                <div
                  className="absolute top-0 left-0 h-full bg-emerald-600 transition-all duration-700 ease-out rounded-r-full"
                  style={{ width: `${progressStats.completed}%` }}
                />
              </div>

              {/* Stats moved here alongside buttons */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end min-w-[2.5rem]">
                  <span className="text-xs font-bold text-foreground">{progressStats.completed}%</span>
                  {progressStats.started > progressStats.completed && (
                    <span className="text-[9px] text-content-muted font-medium whitespace-nowrap leading-none mt-0.5">
                      {progressStats.started}% ini.
                    </span>
                  )}
                </div>

                {/* Action Buttons in List View Footer */}
                <div className="flex items-center gap-1 pl-2 border-l border-border ml-1">

                  <button
                    onClick={onSubjectNotesClick}
                    className="h-7 w-7 flex-none shrink-0 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
                    title="Anotações da matéria"
                  >
                    <NotebookPen className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onToggleExpand}
                    className="h-7 w-7 flex-none shrink-0 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
                    aria-expanded={isExpanded}
                    aria-controls={`topics-${subject.id}`}
                    title={isExpanded ? 'Recolher tópicos' : 'Expandir tópicos'}
                  >
                    <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                      <ChevronDownIcon className="w-4 h-4" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {isExpanded && (
          <div id={`topics-${subject.id}`} className="p-4 pt-0">
            <div className="p-4 bg-secondary/30 rounded-lg">
              <div className="space-y-2">
                {(() => {
                  const topics = (filterTopicsBySearch ? filterTopicsBySearch(subject.topics) : subject.topics);
                  const sortedTopics = [...topics].sort((a, b) => {
                    if (!a.createdAt && !b.createdAt) return 0;
                    if (!a.createdAt) return 1;
                    if (!b.createdAt) return -1;
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                  });

                  return sortedTopics.map(topic => (
                    <StudyCycleTopicItem
                      key={topic.id}
                      topic={topic}
                      onCheckboxClick={() => onCheckboxClick(topic.id)}
                      onOpenNotes={() => onOpenNotes(subject.id, topic.id)}
                      onTopicUpdate={onTopicUpdate}
                      isSubjectFinished={false}
                      isActionable={isActionable}
                      isEditing={editingTopicId === topic.id}
                      onEditingChange={setEditingTopicId}
                      searchQuery={searchQuery}
                      isConsolidated={consolidatedTopicIds?.has(topic.id) || false}
                      mentorAlert={criticalByTopic?.get(topic.id) || gargaloByTopic?.get(topic.id)}
                    />
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-subject-id={subject.id} className={`${cardBaseClasses} flex flex-col ${focusClasses} relative`}>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <CyclePositionBadge />
            <h3 className="text-sm font-semibold text-card-foreground break-words leading-tight">{subject.name.replace(/(\d+ª) visualização/g, '$1')}</h3>
            {mentorAlert && (
              <MentorBadge alert={mentorAlert} />
            )}
            {isFullyCompleted && (
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 py-0 px-1.5 h-5 shrink-0">
                Concluída
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 relative">
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden relative shadow-inner">
            {/* Layer 1: Started (Gray/Phantom) - "In Pipeline" */}
            <div
              className="absolute top-0 left-0 h-full bg-content-muted/30 transition-all duration-700 ease-out rounded-r-full"
              style={{ width: `${progressStats.started}%` }}
            />

            {/* Layer 2: Completed (Emerald) - "Done" */}
            <div
              className="absolute top-0 left-0 h-full bg-emerald-600 transition-all duration-700 ease-out rounded-r-full"
              style={{ width: `${progressStats.completed}%` }}
            />
          </div>

          {/* Stats */}
          <div className="flex flex-col items-end min-w-[3rem]">
            <span className="text-sm font-bold text-foreground">{progressStats.completed}%</span>
            {progressStats.started > progressStats.completed && (
              <span className="text-[10px] text-content-muted font-medium whitespace-nowrap">
                {progressStats.started}% iniciado
              </span>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 pl-2 border-l border-border">

            <button
              onClick={onSubjectNotesClick}
              className="h-7 w-7 flex-none shrink-0 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
              title="Anotações da matéria"
            >
              <NotebookPen className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 bg-secondary/30 flex-grow flex flex-col">
        <div className="space-y-2 overflow-y-auto pr-2 flex-grow" style={{ maxHeight: '12rem' }}>
          {(() => {
            const sortedTopics = [...subject.topics].sort((a, b) => {
              if (!a.createdAt && !b.createdAt) return 0;
              if (!a.createdAt) return 1;
              if (!b.createdAt) return -1;
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            });

            return sortedTopics.map(topic => (
              <StudyCycleTopicItem
                key={topic.id}
                topic={topic}
                onCheckboxClick={() => onCheckboxClick(topic.id)}
                onOpenNotes={() => onOpenNotes(subject.id, topic.id)}
                onTopicUpdate={onTopicUpdate}
                isSubjectFinished={false}
                isActionable={isActionable}
                isEditing={editingTopicId === topic.id}
                onEditingChange={setEditingTopicId}
                isConsolidated={consolidatedTopicIds?.has(topic.id) || false}
              />
            ));
          })()}
        </div>
      </div>
    </div>
  );
};