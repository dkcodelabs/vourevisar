import React, { useMemo, useState } from 'react';
import type { StudyCycleSubject } from '@/types/study-cycle';
import { ReviewInterval } from '@/types/study-cycle';
import { StudyCycleTopicItem } from './StudyCycleTopicItem';
import { ChevronDownIcon } from './Icons';
import { NotebookPen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CycleStatusIndicator } from '@/components/CycleStatusIndicator';
import { Badge } from '@/components/ui/badge';
import { useCycleStatus } from '@/hooks/useCycleStatus';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';

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
  filterTopicsBySearch
}) => {
  const { isSubjectStudied, getNextSuggestedSubject, markSubjectAsStudied, isNextSuggested } = useCycleStatus();
  const { user } = useAuth();
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const isFullyCompleted = useMemo(() => subject.topics.every(t => t.reviewStatus === ReviewInterval.COMPLETED), [subject.topics]);

  // Componente para renderizar a posição no ciclo
  const CyclePositionBadge = () => {
    if (!cyclePosition) return null;

    return (
      <Badge
        variant="secondary"
        className="bg-indigo-100 text-indigo-800 border border-indigo-300 font-mono text-xs min-w-[2.5rem] justify-center font-semibold"
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

  const handleStartAddingTopic = () => {
    // Se não estiver expandido, expandir primeiro
    if (!isExpanded) {
      onToggleExpand();
    }
    // Ativar modo de adição
    setIsAddingTopic(true);
  };

  const handleAddTopic = async () => {
    if (!newTopicName.trim() || !user) return;

    try {
      const originalId = subject.originalId || subject.id;

      // Calcular próxima posição
      // Encontrar a maior posição atual
      const maxPosition = subject.topics.reduce((max, t) => {
        return (t.position || 0) > max ? (t.position || 0) : max;
      }, 0);

      const newPosition = maxPosition + 1;

      const { error } = await supabase
        .from('topics')
        .insert({
          subject_id: originalId,
          name: newTopicName.trim(),
          completed: false,
          review_count: 0,
          review_stage: null,
          next_review: null,
          first_studied_at: null,
          last_reviewed_at: null,
          notes: null,
          position: newPosition
        });

      if (error) throw error;

      setNewTopicName('');
      setIsAddingTopic(false);

      // Disparar evento para atualizar dados
      window.dispatchEvent(new CustomEvent('topicUpdated', {
        detail: { action: 'add', subjectId: originalId }
      }));

      onTopicUpdate?.();
      toast.success('Tópico adicionado com sucesso!');

      // Scroll para o último tópico adicionado
      setTimeout(() => {
        const topicItems = document.querySelectorAll(`[data-subject-id="${subject.id}"] [data-topic-item]`);
        const lastTopic = topicItems[topicItems.length - 1];
        if (lastTopic) {
          lastTopic.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 300);
    } catch (error) {
      console.error('Erro ao adicionar tópico:', error);
      toast.error('Erro ao adicionar tópico');
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
              {isFullyCompleted && (
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 py-0 px-1.5 h-5 shrink-0">
                  Concluída
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 relative">
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden relative">
              {/* Layer 1: Started (Gray/Phantom) - "In Pipeline" */}
              <div
                className="absolute top-0 left-0 h-full bg-gray-300 dark:bg-gray-600 transition-all duration-700 ease-out rounded-r-full"
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
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{progressStats.completed}%</span>
              {progressStats.started > progressStats.completed && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">
                  {progressStats.started}% iniciado
                </span>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-700">
              <button
                onClick={handleStartAddingTopic}
                className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                title="Adicionar novo tópico"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
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
        <div className="p-4 bg-muted/30 flex-grow">
          <h4 className="text-xs font-medium text-muted-foreground mb-3 px-2">Tópicos concluídos:</h4>
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
                />
              ));
            })()}
            {isAddingTopic && (
              <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-700/50 rounded-lg">
                <input
                  type="text"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTopic();
                    if (e.key === 'Escape') {
                      setIsAddingTopic(false);
                      setNewTopicName('');
                    }
                  }}
                  placeholder="Nome do novo tópico..."
                  className="flex-1 text-sm bg-transparent border-none outline-none text-zinc-800 dark:text-zinc-200"
                  autoFocus
                />
                <button
                  onClick={handleAddTopic}
                  className="p-1 text-green-600 hover:text-green-700"
                  title="Salvar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setIsAddingTopic(false);
                    setNewTopicName('');
                  }}
                  className="p-1 text-red-600 hover:text-red-700"
                  title="Cancelar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
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
                {isFullyCompleted && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 py-0 px-1.5 h-5 shrink-0">
                    Concluída
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden relative">
                {/* Layer 1: Started (Gray) */}
                <div
                  className="absolute top-0 left-0 h-full bg-gray-300 dark:bg-gray-600 transition-all duration-700 ease-out rounded-r-full"
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
                  <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{progressStats.completed}%</span>
                  {progressStats.started > progressStats.completed && (
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap leading-none mt-0.5">
                      {progressStats.started}% ini.
                    </span>
                  )}
                </div>

                {/* Action Buttons in List View Footer */}
                <div className="flex items-center gap-1 pl-2 border-l border-gray-200 dark:border-gray-700 ml-1">

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
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="space-y-2">
                {/* New Inline Topic Input (Flex Style) */}
                <div className="flex items-center gap-2 mb-3 bg-white p-1 pl-3 rounded-lg border border-slate-200 shadow-sm" onClick={e => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="Novo tópico..."
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTopic();
                    }}
                    className="flex-1 !h-7 !text-sm border-none bg-transparent outline-none !p-0 text-zinc-800 dark:text-zinc-200 placeholder:text-muted-foreground mr-2"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddTopic}
                    className="!h-7 !w-7 !min-h-0 !min-w-0 !p-0 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-md shrink-0"
                    title="Adicionar Tópico"
                  >
                    <Plus size={16} />
                  </Button>
                </div>

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
            {isFullyCompleted && (
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 py-0 px-1.5 h-5 shrink-0">
                Concluída
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 relative">
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden relative">
            {/* Layer 1: Started (Gray/Phantom) - "In Pipeline" */}
            <div
              className="absolute top-0 left-0 h-full bg-gray-300 dark:bg-gray-600 transition-all duration-700 ease-out rounded-r-full"
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
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{progressStats.completed}%</span>
            {progressStats.started > progressStats.completed && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">
                {progressStats.started}% iniciado
              </span>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-700">

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

      <div className="p-4 bg-muted/30 flex-grow flex flex-col">
        <div className="space-y-2 overflow-y-auto pr-2 flex-grow" style={{ maxHeight: '12rem' }}>
          {/* New Inline Topic Input for Grid View (Flex Style) */}
          <div className="flex items-center gap-2 mb-3 bg-white p-1 pl-3 rounded-lg border border-slate-200 shadow-sm flex-none shrink-0" onClick={e => e.stopPropagation()}>
            <input
              type="text"
              placeholder="Novo tópico..."
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTopic();
              }}
              className="flex-1 !h-7 !text-sm border-none bg-transparent outline-none !p-0 text-zinc-800 dark:text-zinc-200 placeholder:text-muted-foreground mr-2"
            />
            <Button
              size="sm"
              onClick={handleAddTopic}
              className="!h-7 !w-7 !min-h-0 !min-w-0 !p-0 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-md shrink-0"
              title="Adicionar Tópico"
            >
              <Plus size={16} />
            </Button>
          </div>

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
              />
            ));
          })()}
        </div>
      </div>
    </div>
  );
};