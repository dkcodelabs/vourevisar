import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTopicReview } from '@/hooks/useTopicReview';
import { useDailySubjectsWithViews } from '@/hooks/useDailySubjectsWithViews';
import type { StudyCycleSubject, StudyCycleTopic, SubjectStatus, ReviewInterval, Difficulty } from '@/types/study-cycle';
import type { Subject, Topic, UserCycle } from '@/types';

const STUDY_FOCUS_COUNT = 2;

// Mapping functions
const mapStatusToStudyCycleStatus = (status: string): SubjectStatus => {
  switch (status) {
    case 'Nova':
    case 'Em Estudo':
      return 'ACTIVE' as SubjectStatus;
    case 'Concluída':
      return 'FINISHED' as SubjectStatus;
    default:
      return 'ACTIVE' as SubjectStatus;
  }
};

const mapReviewStageToInterval = (reviewStage?: string, completed?: boolean): ReviewInterval => {
  if (completed || reviewStage === 'Concluído') return 'COMPLETED' as ReviewInterval;
  
  switch (reviewStage) {
    case '24h':
    case '1d':
      return 'REVISED_24H' as ReviewInterval; // Primeira revisão (24h) -> mostra como "Revisado (24h)"
    case '3d':
      return 'REVISED_7D' as ReviewInterval; // Segunda revisão (3d) -> mostra como "Revisado (3d)"
    case '7 dias':
    case '7d':
      return 'REVISED_7D' as ReviewInterval; // Segunda revisão (7d) -> mostra como "Revisado (7d)"
    case '15 dias':
    case '15d':
      return 'REVISED_15D' as ReviewInterval; // Terceira revisão (15d) -> mostra como "Revisado (15d)"
    case '30 dias':
    case '30d':
      return 'REVISED_30D' as ReviewInterval; // Quarta revisão (30d) -> mostra como "Revisado (30d)"
    case '60d':
      return 'REVISED_30D' as ReviewInterval; // Quinta revisão (60d) -> mostra como "Revisado (30d)"
    default:
      return 'NOT_STARTED' as ReviewInterval;
  }
};

const mapDifficultyLevel = (level?: number | string): Difficulty => {
  // Se for número (novo formato)
  if (typeof level === 'number') {
    switch (level) {
      case 1:
        return 'EASY' as Difficulty;
      case 2:
        return 'EASY' as Difficulty;
      case 3:
        return 'MEDIUM' as Difficulty;
      case 4:
        return 'HARD' as Difficulty;
      case 5:
        return 'HARD' as Difficulty;
      default:
        return 'MEDIUM' as Difficulty;
    }
  }
  
  // Se for string (formato antigo - compatibilidade)
  switch (level) {
    case 'easy':
      return 'EASY' as Difficulty;
    case 'hard':
      return 'HARD' as Difficulty;
    default:
      return 'MEDIUM' as Difficulty;
  }
};

const mapTopicToStudyCycleTopic = (topic: Topic): StudyCycleTopic => ({
  id: topic.id,
  name: topic.name,
  reviewStatus: mapReviewStageToInterval(topic.reviewStage, topic.completed),
  notes: topic.notes?.content || '',
  difficulty: mapDifficultyLevel(topic.difficulty_level),
  subTopics: topic.subtopics?.map(st => ({ id: st.id, name: st.name })) || []
});

const mapSubjectToStudyCycleSubject = (subject: Subject): StudyCycleSubject => {
  const mappedTopics = subject.topics
    .map(mapTopicToStudyCycleTopic)
    .sort((a, b) => {
      // Ordenar por ID para manter ordem de inserção no banco
      return a.id.localeCompare(b.id);
    });

  // Verificar se todos os tópicos estão concluídos para determinar o status correto
  const isFullyCompleted = mappedTopics.length > 0 && mappedTopics.every(topic => topic.reviewStatus === 'COMPLETED');
  
  return {
    id: subject.id,
    name: subject.name,
    topics: mappedTopics,
    status: isFullyCompleted ? 'FINISHED' as SubjectStatus : mapStatusToStudyCycleStatus(subject.status)
  };
};

// Reverse mapping functions for database updates
const mapIntervalToReviewStage = (interval: ReviewInterval): string => {
  switch (interval) {
    case 'REVISED_24H':
      return '24h';
    case 'REVISED_7D':
      return '7d';
    case 'REVISED_15D':
      return '15d';
    case 'REVISED_30D':
      return '30d';
    case 'COMPLETED':
      return 'Concluído';
    default:
      return '';
  }
};

const mapDifficultyToLevel = (difficulty: Difficulty): number => {
  switch (difficulty) {
    case 'EASY':
      return 2; // Fácil = 2 estrelas
    case 'HARD':
      return 4; // Difícil = 4 estrelas
    default:
      return 3; // Médio = 3 estrelas
  }
};

export const useStudyCycleData = () => {
  const { user } = useAuth();
  
  // Estado local simples - SEM useApp()
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Função para carregar dados localmente - SEM useCallback
  const loadSubjects = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('subjects')
        .select(`*, topics (*, difficulty_level)`)
        .eq('user_id', user.id)
        .order('priority', { ascending: true });
      
      setSubjects(data || []);
    } catch (error) {
      console.error('Erro ao carregar matérias:', error);
    }
  };
  
  // Carregar dados apenas uma vez - SEM DEPENDÊNCIAS
  useEffect(() => {
    if (user) {
      loadSubjects();
    }
  }, [user?.id]); // Apenas user.id como dependência
  
  const refreshData = () => {
    loadSubjects();
  };
  
  const updateTopic = async (topicId: string, updates: any) => {
    try {
      await supabase
        .from('topics')
        .update(updates)
        .eq('id', topicId);
      await loadSubjects();
    } catch (error) {
      console.error('Erro ao atualizar tópico:', error);
    }
  };
  const { markTopicAsReviewed } = useTopicReview();
  const [studyFocusSubjectIds, setStudyFocusSubjectIds] = useState<Set<string>>(new Set());
  const [sessionMarks, setSessionMarks] = useState<Record<string, Set<string>>>({});
  const [userCycle, setUserCycle] = useState<UserCycle | null>(null);

  // Debug removido

  // Load user cycle data
  useEffect(() => {
    const loadUserCycle = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_cycles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Erro ao carregar ciclo:', error);
          return;
        }
        
        // Se o ciclo existe mas está vazio, adicionar matérias ativas
        if (data && (!data.ciclo_atual || data.ciclo_atual.length === 0)) {
          console.log('🔍 Ciclo vazio, adicionando matérias ativas...');
          
          // Buscar matérias ativas
          const { data: activeSubjects, error: subjectsError } = await supabase
            .from('subjects')
            .select('id')
            .eq('user_id', user.id)
            .neq('status', 'Concluída')
            .order('priority', { ascending: true });
          
          if (!subjectsError && activeSubjects && activeSubjects.length > 0) {
            const subjectIds = activeSubjects.map(s => s.id);
            
            // Atualizar o ciclo com as matérias ativas
            const { error: updateError } = await supabase
              .from('user_cycles')
              .update({
                ciclo_atual: subjectIds,
                atualizado_em: new Date().toISOString()
              })
              .eq('user_id', user.id);
            
            if (!updateError) {
              console.log('🔍 Ciclo atualizado com', subjectIds.length, 'matérias');
              // Recarregar o ciclo atualizado
              const { data: updatedCycle } = await supabase
                .from('user_cycles')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();
              
              setUserCycle(updatedCycle);
              return;
            }
          }
        }
        
        setUserCycle(data);
      } catch (error) {
        console.error('Erro ao carregar ciclo:', error);
      }
    };
    
    loadUserCycle();
  }, [user]);

  // Auto-adicionar matérias novas ao ciclo
  useEffect(() => {
    const addNewSubjectsToCycle = async () => {
      if (!user || !userCycle?.ciclo_atual || subjects.length === 0) return;
      
      // Encontrar matérias que não estão no ciclo
      const subjectsNotInCycle = subjects.filter(subject => 
        !userCycle.ciclo_atual.includes(subject.id) && 
        subject.status !== 'Concluída'
      );
      
      if (subjectsNotInCycle.length > 0) {
        console.log('🔄 Adicionando matérias novas ao ciclo:', subjectsNotInCycle.map(s => s.name));
        
        // Adicionar as novas matérias ao ciclo
        const newSubjectIds = subjectsNotInCycle.map(s => s.id);
        const updatedCycle = [...userCycle.ciclo_atual, ...newSubjectIds];
        
        try {
          const { error } = await supabase
            .from('user_cycles')
            .update({
              ciclo_atual: updatedCycle,
              atualizado_em: new Date().toISOString()
            })
            .eq('user_id', user.id);
          
          if (!error) {
            // Atualizar o estado local
            setUserCycle(prev => prev ? { ...prev, ciclo_atual: updatedCycle } : null);
          }
        } catch (error) {
          console.error('Erro ao adicionar matérias ao ciclo:', error);
        }
      }
    };
    
    addNewSubjectsToCycle();
  }, [user?.id, subjects.length]); // Usar apenas user.id e subjects.length para evitar loops

  // Get daily subjects with views
  const dailySubjectsWithViews = useDailySubjectsWithViews(subjects, userCycle);

  // Transform subjects from database to study cycle format, considering views
  const studyCycleSubjects = useMemo(() => {
    // Evitar logs excessivos - só logar quando necessário
    if (subjects.length === 0) return [];

    if (!userCycle?.ciclo_atual) {
      // Fallback to regular subjects if no cycle
      return subjects.map(mapSubjectToStudyCycleSubject);
    }

    // Create subjects based on cycle order with views
    const cycleSubjects: StudyCycleSubject[] = [];
    const processedSubjects = new Map<string, number>();

    // 1. Adicionar matérias do ciclo ativo
    userCycle.ciclo_atual.forEach((subjectId, index) => {
      const subject = subjects.find(s => s.id === subjectId);
      if (!subject) return;

      const viewNumber = (processedSubjects.get(subjectId) || 0) + 1;
      processedSubjects.set(subjectId, viewNumber);

      try {
        const studyCycleSubject = mapSubjectToStudyCycleSubject(subject);
        
        // Add view information to the subject
        if (viewNumber > 1) {
          studyCycleSubject.name = `${subject.name} (${viewNumber}ª visualização)`;
          // Use consistent ID format for views
          studyCycleSubject.id = `${subject.id}-view-${viewNumber}`;
        } else {
          // Keep original ID for first occurrence
          studyCycleSubject.id = subject.id;
        }
        
        studyCycleSubject.originalId = subject.id;
        studyCycleSubject.viewNumber = viewNumber;
        studyCycleSubject.cyclePosition = index + 1; // Posição específica no ciclo
        
        cycleSubjects.push(studyCycleSubject);
      } catch (error) {
        console.error('Erro ao mapear matéria:', error, subject);
      }
    });

    // 2. Adicionar matérias 100% concluídas que NÃO estão no ciclo ativo
    const completedSubjects = subjects.filter(subject => {
      // Verificar se não está no ciclo ativo
      const isInActiveCycle = userCycle.ciclo_atual.includes(subject.id);
      if (isInActiveCycle) return false;

      // Verificar se está 100% concluída
      const mappedTopics = subject.topics
        .map(mapTopicToStudyCycleTopic)
        .sort((a, b) => {
          // Ordenar por ID para manter ordem de inserção no banco
          return a.id.localeCompare(b.id);
        });

      const isFullyCompleted = mappedTopics.length > 0 && mappedTopics.every(topic => topic.reviewStatus === 'COMPLETED');
      return isFullyCompleted;
    });

    // Adicionar matérias 100% concluídas à lista
    completedSubjects.forEach(subject => {
      try {
        const studyCycleSubject = mapSubjectToStudyCycleSubject(subject);
        studyCycleSubject.originalId = subject.id;
        cycleSubjects.push(studyCycleSubject);
      } catch (error) {
        console.error('Erro ao mapear matéria concluída:', error, subject);
      }
    });

    return cycleSubjects;
  }, [subjects, userCycle]);

  // Sistema simplificado - remover lógica de foco diário

  // Group subjects by status
  const groupedSubjects = useMemo(() => {
    return studyCycleSubjects.reduce((acc, subject) => {
      const status = subject.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(subject);
      return acc;
    }, {} as Record<SubjectStatus, StudyCycleSubject[]>);
  }, [studyCycleSubjects]);

  const activeSubjects = groupedSubjects['ACTIVE'] || [];
  const completedCycleSubjects = groupedSubjects['COMPLETED_CYCLE'] || [];

  // Remover lógica de isDayCompleted - sistema simplificado

  // Check if all studies are completed (all subjects are finished and all topics are completed)
  const areAllStudiesCompleted = useMemo(() => {
    if (studyCycleSubjects.length === 0) return false;
    
    return studyCycleSubjects.every(subject => {
      // Subject must be finished
      if (subject.status !== 'FINISHED') return false;
      
      // All topics must be completed
      return subject.topics.every(topic => topic.reviewStatus === 'COMPLETED');
    });
  }, [studyCycleSubjects]);

  // Handle starting new cycle
  const handleStartNewCycle = useCallback(async () => {
    if (!user) return;

    try {
      // Reset subjects that completed cycle back to active
      const subjectsToReset = subjects.filter(s => s.status === 'Concluída');
      
      for (const subject of subjectsToReset) {
        await supabase
          .from('subjects')
          .update({ status: 'Em Estudo' })
          .eq('id', subject.id)
          .eq('user_id', user.id);
      }

      // Refresh data to get updated subjects
      await refreshData();

      // Set new focus subjects
      const newActiveSubjects = subjects.filter(s => s.status !== 'Concluída');
      const newFocusIds = new Set(newActiveSubjects.slice(0, STUDY_FOCUS_COUNT).map(s => s.id));
      setStudyFocusSubjectIds(newFocusIds);
      
      // CORREÇÃO: Resetar progresso diário quando novo ciclo é iniciado
      const { error: resetError } = await supabase
        .from('user_cycles')
        .update({
          materias_estudadas_hoje: [],
          data_ultimo_reset: new Date().toISOString().split('T')[0],
          data_inicio_ciclo: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (resetError) {
        console.error('Erro ao resetar progresso diário:', resetError);
      } else {
        console.log('✅ Progresso diário resetado para novo ciclo');
      }

      // Disparar eventos para atualizar componentes
      window.dispatchEvent(new CustomEvent('cycleUpdated', {
        detail: { 
          isNewCycle: true,
          reason: 'newCycleStarted',
          timestamp: Date.now()
        }
      }));

      window.dispatchEvent(new CustomEvent('dailyProgressUpdated', {
        detail: { 
          isReset: true,
          reason: 'newCycleStarted',
          timestamp: Date.now()
        }
      }));

    } catch (error) {
      console.error('Error starting new cycle:', error);
    }
  }, [user, subjects, refreshData]);

  // Handle topic marking for review
  const handleToggleMark = useCallback((subjectId: string, topicId: string) => {
    setSessionMarks(prev => {
      const currentMarks = prev[subjectId] ? new Set(prev[subjectId]) : new Set<string>();
      if (currentMarks.has(topicId)) {
        currentMarks.delete(topicId);
      } else {
        currentMarks.add(topicId);
      }
      return {
        ...prev,
        [subjectId]: currentMarks,
      };
    });
  }, []);

  // Handle completing a study session
  const handleCompleteSession = useCallback(async (subjectId: string) => {
    const revisedTopicIds = Array.from(sessionMarks[subjectId] || []);
    if (revisedTopicIds.length === 0) return;

    try {
      console.log('🔵 handleCompleteSession - Processando revisões:', {
        subjectId,
        revisedTopicIds
      });

      // Update each revised topic using the same logic as the study plan
      for (const topicId of revisedTopicIds) {
        console.log('🔵 Marcando tópico como revisado:', topicId);
        await markTopicAsReviewed(topicId);
      }

      // Clear session marks for this subject
      setSessionMarks(prev => {
        const newMarks = { ...prev };
        delete newMarks[subjectId];
        return newMarks;
      });

      // Recarregar dados dos subjects para mostrar próxima revisão
      await refreshData();
      
      // Recarregar dados do ciclo
      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_cycles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (!error) {
            setUserCycle(data);
          }
        } catch (error) {
          console.error('Erro ao recarregar ciclo:', error);
        }
      }

      console.log('✅ handleCompleteSession - Sessão completada com sucesso');
      
      // Disparar evento para atualizar estatísticas imediatamente
      window.dispatchEvent(new CustomEvent('cycleUpdated', {
        detail: { 
          subjectId: revisedTopicIds[0], // Usar primeiro tópico como referência
          completed: true,
          topicsCount: revisedTopicIds.length
        }
      }));

    } catch (error) {
      console.error('❌ Error completing session:', error);
      throw error;
    }
  }, [sessionMarks, markTopicAsReviewed, refreshData, user]);

  // Handle saving topic notes
  const handleSaveNotes = useCallback(async (subjectId: string, topicId: string, updatedData: Partial<StudyCycleTopic>) => {
    try {
      console.log('🔵 handleSaveNotes - Salvando dados do tópico:', {
        subjectId,
        topicId,
        updatedData
      });

      const updatePayload: any = {};
      
      if (updatedData.notes !== undefined) {
        updatePayload.notes = { content: updatedData.notes };
      }
      
      if (updatedData.difficulty !== undefined) {
        updatePayload.difficulty_level = mapDifficultyToLevel(updatedData.difficulty);
        updatePayload.difficulty_set_at = new Date();
      }

      if (updatedData.subTopics !== undefined) {
        updatePayload.subtopics = updatedData.subTopics;
      }

      await updateTopic(subjectId, topicId, updatePayload);
      await refreshData();

      console.log('✅ handleSaveNotes - Notas salvas com sucesso');
      
    } catch (error) {
      console.error('❌ Error saving topic notes:', error);
      throw error;
    }
  }, [updateTopic, refreshData]);

  // Function to refresh cycle data
  const refreshCycleData = useCallback(async () => {
    if (!user) return;
    
    try {
      // Refresh subjects data to show updated review status
      await refreshData();
      
      const { data, error } = await supabase
        .from('user_cycles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Erro ao recarregar ciclo:', error);
        return;
      }
      
      setUserCycle(data);
    } catch (error) {
      console.error('Erro ao recarregar ciclo:', error);
    }
  }, [user, refreshData]);

  return {
    studyCycleSubjects,
    groupedSubjects,
    activeSubjects,
    completedCycleSubjects,
    areAllStudiesCompleted,

    sessionMarks,
    userCycle,
    dailySubjectsWithViews,
    handleStartNewCycle,
    handleToggleMark,
    handleCompleteSession,
    handleSaveNotes,
    refreshCycleData
  };
};

// Helper function to get next review interval
const reviewProgression = [
  'NOT_STARTED' as ReviewInterval,
  'REVISED_24H' as ReviewInterval,
  'REVISED_7D' as ReviewInterval,
  'REVISED_15D' as ReviewInterval,
  'REVISED_30D' as ReviewInterval,
  'COMPLETED' as ReviewInterval,
];

const getNextReviewInterval = (currentStatus: ReviewInterval): ReviewInterval => {
  const currentIndex = reviewProgression.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex === reviewProgression.length - 1) {
    return currentStatus;
  }
  return reviewProgression[currentIndex + 1];
};