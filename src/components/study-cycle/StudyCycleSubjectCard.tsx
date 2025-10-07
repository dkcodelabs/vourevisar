import React, { useMemo } from 'react';
import type { StudyCycleSubject } from '@/types/study-cycle';
import { ReviewInterval } from '@/types/study-cycle';
import { StudyCycleTopicItem } from './StudyCycleTopicItem';
import { ChevronDownIcon } from './Icons';
import { NotebookPen } from 'lucide-react';
import { CycleStatusIndicator } from '@/components/CycleStatusIndicator';
import { useCycleStatus } from '@/hooks/useCycleStatus';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface StudyCycleSubjectCardProps {
  subject: StudyCycleSubject;
  onCompleteSession: (subjectId: string) => void;
  onOpenNotes: (subjectId: string, topicId: string) => void;
  onSubjectNotesClick: () => void;
  isActionable: boolean;
  isStudyFocus: boolean;
  viewMode: 'grid' | 'list';
  isExpanded: boolean;
  onToggleExpand: () => void;
  markedTopicIds: Set<string>;
  onToggleMark: (topicId: string) => void;
}

const reviewProgression = [
  ReviewInterval.NOT_STARTED,
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
  isActionable,
  isStudyFocus,
  viewMode,
  isExpanded,
  onToggleExpand,
  markedTopicIds,
  onToggleMark
}) => {
  const { isSubjectStudied, getNextSuggestedSubject, markSubjectAsStudied, isNextSuggested } = useCycleStatus();
  const { user } = useAuth();
  const isFullyCompleted = useMemo(() => subject.topics.every(t => t.reviewStatus === ReviewInterval.COMPLETED), [subject.topics]);

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
      
      // 2. Marcar como estudada no ciclo E verificar se é a última
      const originalId = subject.originalId || subject.id;
      console.log('🔵 Chamando markSubjectAsStudied com ID:', originalId);
      const success = await markSubjectAsStudied(originalId, subject.name);
      
      if (success) {
        console.log('✅ Matéria marcada como estudada com sucesso');
        
        // 3. VERIFICAÇÃO IMEDIATA: Era a última matéria não estudada?
        // Vamos verificar diretamente no banco de dados
        await checkIfLastSubjectAndShowModal(originalId, subject.name);
      }
      
      console.log('✅ handleComplete concluído');
    } catch (error) {
      console.error('Erro ao completar sessão:', error);
    }
  };

  const checkIfLastSubjectAndShowModal = async (subjectId: string, subjectName: string) => {
    try {
      console.log('🔍 Verificando se era a última matéria não estudada...');
      
      // Buscar dados atualizados do ciclo
      const { data: cycleData, error: cycleError } = await supabase
        .from('user_cycles')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      
      if (cycleError || !cycleData) {
        console.error('Erro ao buscar dados do ciclo:', cycleError);
        return;
      }
      
      // Buscar todas as matérias
      const { data: allSubjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user?.id);
      
      if (subjectsError || !allSubjects) {
        console.error('Erro ao buscar matérias:', subjectsError);
        return;
      }
      
      // Filtrar matérias ativas (não 100% concluídas) no ciclo atual
      const activeSubjectsInCycle = cycleData.ciclo_atual.filter(id => {
        const subject = allSubjects.find(s => s.id === id);
        if (!subject) return false;
        
        if (subject.topics && subject.topics.length > 0) {
          const completedTopics = subject.topics.filter(topic =>
            topic.reviewStage === 'Concluído'
          ).length;
          const progress = Math.round((completedTopics / subject.topics.length) * 100);
          return progress < 100; // Só incluir se não estiver 100% concluída
        }
        return true;
      });
      
      // Verificar quantas matérias ativas ainda não foram estudadas
      const unstudiedActiveSubjects = activeSubjectsInCycle.filter(id => {
        return !cycleData.materias_estudadas_ciclo.includes(id);
      });
      
      console.log('🔍 Verificação final:', {
        activeSubjectsInCycle: activeSubjectsInCycle.length,
        unstudiedActiveSubjects: unstudiedActiveSubjects.length,
        materias_estudadas: cycleData.materias_estudadas_ciclo.length
      });
      
      // Se não há mais matérias ativas não estudadas, é hora do novo ciclo!
      if (unstudiedActiveSubjects.length === 0) {
        console.log('🎉 ÚLTIMA MATÉRIA CONFIRMADA! Iniciando novo ciclo...');
        
        // Atualizar para novo ciclo no banco
        const { error: updateError } = await supabase
          .from('user_cycles')
          .update({
            materias_estudadas_ciclo: [],
            ciclos_realizados: (cycleData.ciclos_realizados || 0) + 1,
            data_inicio_ciclo: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
          })
          .eq('user_id', user?.id);
        
        if (updateError) {
          console.error('Erro ao atualizar ciclo:', updateError);
          return;
        }
        
        // Mostrar modal
        console.log('🎉 Disparando modal de novo ciclo...');
        window.dispatchEvent(new CustomEvent('newCycleStarted', {
          detail: {
            cycleNumber: (cycleData.ciclos_realizados || 0) + 1,
            totalSubjects: activeSubjectsInCycle.length
          }
        }));
        
        toast.success('🎉 Parabéns! Você completou o ciclo de estudos!');
      } else {
        console.log(`📚 Ainda faltam ${unstudiedActiveSubjects.length} matérias no ciclo atual`);
        toast.info(`📚 Matéria estudada! Ainda faltam ${unstudiedActiveSubjects.length} matérias no ciclo.`);
      }
      
    } catch (error) {
      console.error('Erro ao verificar última matéria:', error);
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
            <h3 className="text-base text-card-foreground" style={{ fontWeight: 700 }}>{subject.name}</h3>
            <button
              onClick={onSubjectNotesClick}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
              title="Anotações da matéria"
            >
              <NotebookPen className="w-4 h-4" />
            </button>
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
            {subject.topics.map(topic => (
              <StudyCycleTopicItem
                key={topic.id}
                topic={topic}
                isMarkedInSession={false}
                onToggleMark={() => { }}
                onOpenNotes={() => onOpenNotes(subject.id, topic.id)}
                isSubjectFinished={true}
                isActionable={false}
              />
            ))}
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
                  isStudied={(() => {
                    const id = subject.originalId || subject.id;
                    
                    // Se a matéria está 100% concluída, sempre verde
                    const isFullyCompleted = subject.topics.length > 0 && subject.topics.every(topic => topic.reviewStatus === 'COMPLETED');
                    if (isFullyCompleted) return true;
                    
                    // Senão, verificar se foi estudada no ciclo atual
                    const studied = isSubjectStudied(id);

                    return studied;
                  })()}
                  isNextSuggested={isNextSuggested(subject.originalId || subject.id)}
                  variant="dot"
                />
                <h3 className="text-base text-card-foreground truncate" style={{ fontWeight: 700 }}>{subject.name}</h3>
              </div>
              <button
                onClick={onSubjectNotesClick}
                className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
                title="Anotações da matéria"
              >
                <NotebookPen className="w-4 h-4" />
              </button>
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
                {subject.topics.map(topic => (
                  <StudyCycleTopicItem
                    key={topic.id}
                    topic={topic}
                    isMarkedInSession={markedTopicIds.has(topic.id)}
                    onToggleMark={onToggleMark}
                    onOpenNotes={() => onOpenNotes(subject.id, topic.id)}
                    isSubjectFinished={false}
                    isActionable={isActionable}
                  />
                ))}
              </div>
              {isActionable && (
                <div className="mt-4 pt-4 border-t border-border flex justify-end">
                  <button
                    onClick={handleComplete}
                    disabled={markedTopicIds.size === 0}
                    className="bg-sky-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:bg-sky-700 disabled:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground text-sm"
                  >
                    Concluir Sessão ({markedTopicIds.size})
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${cardBaseClasses} flex flex-col ${focusClasses} relative`}>
      <CycleStatusIndicator 
        isStudied={(() => {
          const id = subject.originalId || subject.id;
          
          // Se a matéria está 100% concluída, sempre verde
          const isFullyCompleted = subject.topics.length > 0 && subject.topics.every(topic => topic.reviewStatus === 'COMPLETED');
          if (isFullyCompleted) return true;
          
          // Senão, verificar se foi estudada no ciclo atual
          return isSubjectStudied(id);
        })()}
        isNextSuggested={isNextSuggested(subject.originalId || subject.id)}
        variant="badge"
        className="absolute top-2 right-2 z-10"
      />
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <h3 className="text-base text-card-foreground truncate" style={{ fontWeight: 700 }}>{subject.name}</h3>
          </div>
          <button
            onClick={onSubjectNotesClick}
            className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
            title="Anotações da matéria"
          >
            <NotebookPen className="w-4 h-4" />
          </button>
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
              isMarkedInSession={markedTopicIds.has(topic.id)}
              onToggleMark={onToggleMark}
              onOpenNotes={() => onOpenNotes(subject.id, topic.id)}
              isSubjectFinished={false}
              isActionable={isActionable}
            />
          ))}
        </div>
      </div>

      {isActionable && (
        <div className="p-4 bg-card border-t border-border mt-auto flex justify-end">
          <button
            onClick={handleComplete}
            disabled={markedTopicIds.size === 0}
            className="bg-sky-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:bg-sky-700 disabled:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground text-sm"
          >
            Concluir Sessão ({markedTopicIds.size})
          </button>
        </div>
      )}
    </div>
  );
};