import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserCycle } from '@/types';
import { toast } from 'sonner';
import { generateNextDay, loadUserCycle, createCycleForOrphanSubjects } from '@/utils/cycleUtils';
import { completeStudySession } from '@/utils/sessionUtils';
import { checkAllStudiesCompleted, isTopicDominated, syncSubjectStatus } from '@/utils/studiesCompletionChecker';

export const useStudyPlanLogic = () => {
  const { subjects, isLoading, refreshData } = useApp();
  const { user } = useAuth();
  const [expandedSubject, setExpandedSubject] = useState<string>('');
  const [tempMarkedTopics, setTempMarkedTopics] = useState<Record<string, string[]>>({});
  const [showNewCycleMessage, setShowNewCycleMessage] = useState(false);
  const [userCycle, setUserCycle] = useState<UserCycle | null>(null);
  const [allStudiesCompleted, setAllStudiesCompleted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtered subjects based on status
  const disciplinasIniciadas = subjects.filter(s => s.status === 'Em Estudo');
  const disciplinasNaoIniciadas = subjects.filter(s => s.status === 'Nova');
  const hasAvailableSubjects = subjects.length > 0;

  // Calculate cycle metrics correctly
  const totalDisciplinasCiclo = userCycle?.ciclo_atual?.length || 0;
  
  // Disciplinas concluídas = subjects that are marked as completed AND are in the current cycle
  const disciplinasConcluidas = userCycle?.ciclo_atual?.filter(subjectId => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.status === 'Concluída';
  }).length || 0;

  // Get subjects that are in cycle but not completed (these are initiated but not finished)
  const disciplinasIniciadasNoCiclo = userCycle?.ciclo_atual?.filter(subjectId => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject && subject.status !== 'Concluída';
  }).length || 0;

  const isNewCycleStarted = userCycle && userCycle.ciclo_atual.length > 0 && 
    !userCycle.data_fim_ciclo && userCycle.disciplinas_do_dia.length === 0;

  // Check if current cycle is completed (all subjects in cycle are completed)
  const currentCycleCompleted = userCycle && userCycle.ciclo_atual.length > 0 && 
    disciplinasConcluidas === totalDisciplinasCiclo;

  // Check if ALL studies are completed (no subjects with status != 'Concluída')
  const allStudiesReallyCompleted = subjects.length > 0 && 
    subjects.every(subject => subject.status === 'Concluída');

  console.log('📊 useStudyPlanLogic - Cycle vs Studies completion:', {
    currentCycleCompleted,
    allStudiesReallyCompleted,
    disciplinasConcluidas,
    totalDisciplinasCiclo,
    subjectsWithStatusNotCompleted: subjects.filter(s => s.status !== 'Concluída').length,
    totalSubjects: subjects.length
  });

  // Debug log dos subjects carregados
  useEffect(() => {
    console.log('📚 useStudyPlanLogic - Subjects loaded:', {
      subjectsCount: subjects.length,
      subjects: subjects.map(s => ({ id: s.id, name: s.name, status: s.status })),
      isLoading
    });
  }, [subjects, isLoading]);

  // Sincronização periódica dos status das matérias - com debounce para evitar loops
  useEffect(() => {
    if (subjects.length > 0 && !isRefreshing) {
      const timeoutId = setTimeout(() => {
        syncSubjectStatus(subjects);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [subjects, isRefreshing]);

  // Check for all studies completed - apenas quando REALMENTE todos os estudos estão completos
  useEffect(() => {
    if (subjects.length > 0 && !isRefreshing) {
      const allCompleted = allStudiesReallyCompleted;
      console.log('🎯 useStudyPlanLogic - Setting allStudiesCompleted:', allCompleted);
      
      // Só atualiza se o valor realmente mudou
      if (allStudiesCompleted !== allCompleted) {
        setAllStudiesCompleted(allCompleted);
        
        // Se todos os estudos estão completos, refresh dos dados apenas uma vez
        if (allCompleted && !isRefreshing) {
          setIsRefreshing(true);
          console.log('🎯 Todos os estudos completos - fazendo refresh dos dados');
          setTimeout(() => {
            refreshData().finally(() => {
              setIsRefreshing(false);
            });
          }, 2000);
        }
      }
    } else if (subjects.length === 0 && !isLoading) {
      console.log('🎯 useStudyPlanLogic - No subjects found, setting allStudiesCompleted to false');
      setAllStudiesCompleted(false);
    }
  }, [subjects, refreshData, allStudiesCompleted, isRefreshing, isLoading, allStudiesReallyCompleted]);

  // Load user cycle and handle orphan subjects - com proteção contra loops
  useEffect(() => {
    const loadCycleAndHandleOrphans = async () => {
      if (!user || subjects.length === 0 || isRefreshing) return;

      try {
        console.log('🔄 Loading user cycle...');
        const data = await loadUserCycle(user.id);
        console.log('🔄 User cycle loaded:', data);
        
        // Se o ciclo atual mudou, atualiza o estado
        if (JSON.stringify(data) !== JSON.stringify(userCycle)) {
          setUserCycle(data);
        }
        
        // If no cycle exists or cycle is empty but there are "Em Estudo" subjects
        if (!data || !data.ciclo_atual || data.ciclo_atual.length === 0) {
          const orphanSubjects = subjects.filter(s => s.status === 'Em Estudo');
          
          if (orphanSubjects.length > 0 && !isRefreshing) {
            console.log('🔄 Found orphan subjects, creating cycle...');
            setIsRefreshing(true);
            
            try {
              const result = await createCycleForOrphanSubjects(user.id, subjects);
              
              if (result) {
                // Reload the cycle after creating it
                const newCycle = await loadUserCycle(user.id);
                setUserCycle(newCycle);
                toast.success(`Ciclo criado para ${orphanSubjects.length} matéria(s) reativada(s)!`);
              }
            } finally {
              setIsRefreshing(false);
            }
          }
        }
      } catch (error) {
        console.error('Exception loading user cycle:', error);
        setIsRefreshing(false);
      }
    };

    const timeoutId = setTimeout(loadCycleAndHandleOrphans, 500);
    return () => clearTimeout(timeoutId);
  }, [user, subjects, userCycle, isRefreshing]);

  const dailySubjects = userCycle?.disciplinas_do_dia
    ? subjects.filter(subject => 
        userCycle.disciplinas_do_dia.includes(subject.id) && 
        subject.status !== 'Concluída'
      )
    : [];

  const nextSubjects = userCycle?.ciclo_atual
    ? subjects.filter(subject => 
        userCycle.ciclo_atual.includes(subject.id) && 
        !userCycle.disciplinas_do_dia.includes(subject.id) &&
        subject.status !== 'Concluída'
      ).slice(0, 3)
    : [];

  // Lógica melhorada para day completed - só mostra se o dia foi completo mas ainda há matérias no ciclo
  const allDaySubjectsCompleted = dailySubjects.length === 0 && 
    userCycle && 
    userCycle.disciplinas_do_dia.length > 0 &&
    !allStudiesCompleted &&
    !currentCycleCompleted &&
    !isRefreshing;

  console.log('🎯 useStudyPlanLogic - Render state:', {
    allStudiesCompleted,
    allDaySubjectsCompleted,
    currentCycleCompleted,
    subjectsLength: subjects.length,
    dailySubjectsLength: dailySubjects.length,
    hasAvailableSubjects,
    disciplinasIniciadas: disciplinasIniciadas.length,
    disciplinasNaoIniciadas: disciplinasNaoIniciadas.length,
    totalDisciplinasCiclo,
    disciplinasConcluidas,
    disciplinasIniciadasNoCiclo,
    isRefreshing,
    userCycle: userCycle ? {
      ciclo_atual: userCycle.ciclo_atual,
      disciplinas_do_dia: userCycle.disciplinas_do_dia
    } : null
  });

  const handleNextDay = useCallback(async () => {
    if (!user || !userCycle || isRefreshing) return;

    try {
      setIsRefreshing(true);
      const result = await generateNextDay(user.id, userCycle, subjects);
      
      if (result.shouldShowNewCycleMessage) {
        setShowNewCycleMessage(true);
        return;
      }

      setUserCycle(prev => prev ? {
        ...prev,
        disciplinas_do_dia: result.newDisciplinasoDia
      } : null);

      toast.success('Novo plano diário gerado!');
    } catch (error) {
      console.error('Error generating next day:', error);
      toast.error('Erro ao gerar próximo dia');
    } finally {
      setIsRefreshing(false);
    }
  }, [user, userCycle, subjects, isRefreshing]);

  const handleCompleteSession = useCallback(async (subjectId: string) => {
    const markedTopics = tempMarkedTopics[subjectId] || [];
    
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      const result = await completeStudySession(subjectId, markedTopics, subjects);
      
      if (result.subjectCompleted) {
        toast.success(`Matéria "${result.subjectName}" concluída! 🎉`);
      }

      // Clear temp marked topics
      setTempMarkedTopics(prev => ({
        ...prev,
        [subjectId]: []
      }));

      setExpandedSubject('');
      toast.success('Sessão concluída com sucesso!');

      // Refresh dos dados para garantir que a interface seja atualizada
      setTimeout(() => {
        refreshData().finally(() => {
          setIsRefreshing(false);
        });
      }, 1000);

    } catch (error) {
      console.error('Error completing session:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao concluir sessão');
      setIsRefreshing(false);
    }
  }, [tempMarkedTopics, subjects, refreshData, isRefreshing]);

  const handleToggleExpand = useCallback((subjectId: string) => {
    setExpandedSubject(prev => prev === subjectId ? '' : subjectId);
  }, []);

  const handleMarkTopicForReview = useCallback((subjectId: string, topicId: string) => {
    setTempMarkedTopics(prev => ({
      ...prev,
      [subjectId]: [...(prev[subjectId] || []), topicId]
    }));
  }, []);

  const handleCancelTopicReview = useCallback((subjectId: string, topicId: string) => {
    setTempMarkedTopics(prev => ({
      ...prev,
      [subjectId]: (prev[subjectId] || []).filter(id => id !== topicId)
    }));
  }, []);

  const handleHideNewCycleMessage = useCallback(() => {
    setShowNewCycleMessage(false);
  }, []);

  return {
    isLoading: isLoading || isRefreshing,
    expandedSubject,
    tempMarkedTopics,
    showNewCycleMessage,
    userCycle,
    dailySubjects,
    nextSubjects,
    allDaySubjectsCompleted,
    hasAvailableSubjects,
    totalDisciplinasCiclo,
    disciplinasConcluidas,
    isNewCycleStarted,
    allStudiesCompleted,
    currentCycleCompleted,
    handleNextDay,
    handleCompleteSession,
    handleToggleExpand,
    handleMarkTopicForReview,
    handleCancelTopicReview,
    handleHideNewCycleMessage,
    disciplinasIniciadas: disciplinasIniciadasNoCiclo,
    disciplinasNaoIniciadas: disciplinasNaoIniciadas.length,
    isTopicDominated
  };
};
