import React, { useMemo, useState } from 'react';
import type { StudyCycleSubject } from '@/types/study-cycle';
import { ReviewInterval } from '@/types/study-cycle';
import { StudyCycleTopicItem } from './StudyCycleTopicItem';
import { ChevronDownIcon } from './Icons';
import { NotebookPen } from 'lucide-react';
import { CycleStatusIndicator } from '@/components/CycleStatusIndicator';
import { Badge } from '@/components/ui/badge';
import { useCycleStatus } from '@/hooks/useCycleStatus';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
        #{cyclePosition}
      </Badge>
    );
  };

  const progress = useMemo(() => {
    if (subject.topics.length === 0) return 0;
    if (isFullyCompleted) return 100;

    const totalSteps = subject.topics.length * (reviewProgression.length - 1);
    const completedSteps = subject.topics.reduce((acc, topic) => {
      const index = reviewProgression.indexOf(topic.reviewStatus);
      return acc + (index > -1 ? index : 0);
    }, 0);
    return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  }, [subject.topics, isFullyCompleted]);

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
          notes: null
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
    } catch (error) {
      console.error('Erro ao adicionar tópico:', error);
      toast.error('Erro ao adicionar tópico');
    }
  };



  const cardBaseClasses = "bg-card rounded-2xl shadow-md overflow-hidden transition-all duration-300";
  const focusClasses = isStudyFocus
    ? 'relative transform scale-[1.03] shadow-[0_0_20px_rgba(14,165,233,0.2)] dark:shadow-[0_0_20px_rgba(56,189,248,0.15)] z-10'
    : '';

  if (isFullyCompleted && viewMode === 'grid') {
    return (
      <div className="bg-card rounded-2xl shadow-md overflow-hidden flex flex-col">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <CyclePositionBadge />
              <h3 className="text-base text-card-foreground truncate" style={{ fontWeight: 700 }}>{subject.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleStartAddingTopic}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                title="Adicionar novo tópico"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Tópico</span>
              </button>
              <button
                onClick={onSubjectNotesClick}
                className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
                title="Anotações da matéria"
              >
                <NotebookPen className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className="bg-emerald-500 h-2.5 rounded-full"
                style={{ width: '100%' }}
              ></div>
            </div>
            <span className="text-sm font-semibold text-emerald-500">100%</span>
          </div>
        </div>
        <div className="p-4 bg-muted/30 flex-grow">
          <h4 className="text-xs font-medium text-muted-foreground mb-3 px-2">Tópicos concluídos:</h4>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
            {(filterTopicsBySearch ? filterTopicsBySearch(subject.topics) : subject.topics).map(topic => (
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
            ))}
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
      <div className={`${cardBaseClasses} w-full ${focusClasses}`}>
        <div className="w-full flex items-center p-4 gap-4">
          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <CycleStatusIndicator
                  key={`${subject.id}-${Date.now()}`} // CRÍTICO: Forçar re-render com timestamp
                  isStudied={(() => {
                    const id = subject.originalId || subject.id;

                    // Se a matéria está 100% concluída, sempre verde
                    const isFullyCompleted = subject.topics.length > 0 && subject.topics.every(topic => topic.reviewStatus === 'COMPLETED');
                    if (isFullyCompleted) return true;

                    // Senão, verificar se foi estudada no ciclo atual
                    const studied = isSubjectStudied(id);
                    // Log removido para evitar spam
                    return studied;
                  })()}
                  isNextSuggested={isNextSuggested(subject.originalId || subject.id)}
                  variant="dot"
                />
                <CyclePositionBadge />
                <h3 className="text-base text-card-foreground truncate" style={{ fontWeight: 700 }}>{subject.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleStartAddingTopic}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                  title="Adicionar novo tópico"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Tópico</span>
                </button>
                <button
                  onClick={onSubjectNotesClick}
                  className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
                  title="Anotações da matéria"
                >
                  <NotebookPen className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">{progress}%</span>
            </div>
          </div>
          <button
            onClick={onToggleExpand}
            className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
            aria-expanded={isExpanded}
            aria-controls={`topics-${subject.id}`}
            title={isExpanded ? 'Recolher tópicos' : 'Expandir tópicos'}
          >
            <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
              <ChevronDownIcon />
            </div>
          </button>
        </div>
        {isExpanded && (
          <div id={`topics-${subject.id}`} className="p-4 pt-0">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="space-y-2">
                {(filterTopicsBySearch ? filterTopicsBySearch(subject.topics) : subject.topics).map(topic => (
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
                ))}
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
        )}
      </div>
    );
  }

  return (
    <div className={`${cardBaseClasses} flex flex-col ${focusClasses} relative`}>
      <CycleStatusIndicator
        key={`${subject.id}-${Date.now()}`} // CRÍTICO: Forçar re-render com timestamp
        isStudied={(() => {
          const id = subject.originalId || subject.id;

          // Se a matéria está 100% concluída, sempre verde
          const isFullyCompleted = subject.topics.length > 0 && subject.topics.every(topic => topic.reviewStatus === 'COMPLETED');
          if (isFullyCompleted) return true;

          // Senão, verificar se foi estudada no ciclo atual
          const studied = isSubjectStudied(id);
          console.log(`🔍 Status de ${subject.name}:`, { id, studied, isFullyCompleted });
          return studied;
        })()}
        isNextSuggested={isNextSuggested(subject.originalId || subject.id)}
        variant="badge"
        className="absolute top-2 right-2 z-10"
      />
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <CyclePositionBadge />
            <h3 className="text-base text-card-foreground truncate" style={{ fontWeight: 700 }}>{subject.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartAddingTopic}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
              title="Adicionar novo tópico"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Tópico</span>
            </button>
            <button
              onClick={onSubjectNotesClick}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
              title="Anotações da matéria"
            >
              <NotebookPen className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <div className="w-full bg-muted rounded-full h-2.5">
            <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
          <span className="text-sm font-semibold text-muted-foreground">{progress}%</span>
        </div>
      </div>

      <div className="p-4 bg-muted/30 flex-grow flex flex-col">
        <div className="space-y-2 overflow-y-auto pr-2 flex-grow" style={{ maxHeight: '12rem' }}>
          {subject.topics.map(topic => (
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
          ))}
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
};