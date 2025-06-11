import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserCycle } from '@/types';
import { toast } from 'sonner';
import { generateNextDay, loadUserCycle, createCycleForOrphanSubjects } from '@/utils/cycleUtils';
import { completeStudySession } from '@/utils/sessionUtils';
import { isTopicDominated, syncSubjectStatus } from '@/utils/studiesCompletionChecker';

export const useStudyPlanLogic = () => {
  const { subjects, isLoading, refreshData } = useApp();
  const { user } = useAuth();
  const [expandedSubject, setExpandedSubject] = useState<string>('');
  const [tempMarkedTopics, setTempMarkedTopics] = useState<Record<string, string[]>>({});
  const [showNewCycleMessage, setShowNewCycleMessage] = useState(false);
  const [userCycle, setUserCycle] = useState<UserCycle | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // CORREÇÃO: Filtered subjects based on status - apenas matérias que realmente existem
  const disciplinasIniciadas = subjects.filter(s => s.status === 'Em Estudo');
  const disciplinasNaoIniciadas = subjects.filter(s => s.status === 'Nova');
  const disciplinasConcluidas = subjects.filter(s => s.status === 'Concluída');
  const hasAvailableSubjects = subjects.length > 0;

  // CORREÇÃO PRINCIPAL: Calculate cycle metrics baseado no ciclo atual
  const totalDisciplinasCiclo = userCycle?.ciclo_atual?.length || 0;
  
  // CORREÇÃO: Disciplinas concluídas apenas no ciclo atual
  const disciplinasConcluidasNoCiclo = userCycle?.ciclo_atual?.filter(subjectId => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.status === 'Concluída';
  }).length || 0;

  // CORREÇÃO: Disciplinas iniciadas apenas no ciclo atual (não concluídas)
  const disciplinasIniciadasNoCiclo = userCycle?.ciclo_atual?.filter(subjectId => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject && subject.status !== 'Concluída';
  }).length || 0;

  const isNewCycleStarted = userCycle && userCycle.ciclo_atual.length > 0 && 
    !userCycle.data_fim_ciclo && userCycle.disciplinas_do_dia.length === 0;

  // CORREÇÃO: Check if current cycle is completed (all subjects in cycle are completed)
  const currentCycleCompleted = userCycle && userCycle.ciclo_atual.length > 0 && 
    disciplinasConcluidasNoCiclo === totalDisciplinasCiclo && disciplinasConcluidasNoCiclo > 0;

  // CORREÇÃO: Check if ALL studies are completed (no subjects with status != 'Concluída')
  const allStudiesCompleted = subjects.length > 0 && 
    subjects.every(subject => subject.status === 'Concluída');

  console.log('🎯 useStudyPlanLogic - DEBUGGING STATE:', {
    totalSubjects: subjects.length,
    subjectsByStatus: {
      'Concluída': disciplinasConcluidas.length,
      'Em Estudo': disciplinasIniciadas.length,
      'Nova': disciplinasNaoIniciadas.length
    },
    currentCycleCompleted,
    allStudiesCompleted,
    disciplinasConcluidasNoCiclo,
    totalDisciplinasCiclo,
    disciplinasIniciadasNoCiclo,
    userCycle: userCycle ? {
      ciclo_atual: userCycle.ciclo_atual.length,
      disciplinas_do_dia: userCycle.disciplinas_do_dia.length
    } : null
  });

  // Debug log dos subjects carregados
  useEffect(() => {
    console.log('📚 useStudyPlanLogic - Subjects loaded:', {
      subjectsCount: subjects.length,
      subjects: subjects.map(s => ({ id: s.id, name: s.name, status: s.status, priority: s.priority })),
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

  // CORREÇÃO: Filtered daily subjects - apenas matérias que estão na fila do dia E não concluídas
  const dailySubjects = userCycle?.disciplinas_do_dia
    ? subjects
        .filter(subject => 
          userCycle.disciplinas_do_dia.includes(subject.id) && 
          subject.status !== 'Concluída'
        )
        .sort((a, b) => {
          // Ordenar pela posição na fila de disciplinas do dia
          const indexA = userCycle.disciplinas_do_dia.indexOf(a.id);
          const indexB = userCycle.disciplinas_do_dia.indexOf(b.id);
          if (indexA !== indexB) return indexA - indexB;
          // Se mesma posição, ordenar por prioridade
          return (a.priority || 999) - (b.priority || 999);
        })
    : [];

  // CORREÇÃO CRÍTICA: NextSubjects - JAMAIS incluir matérias concluídas
  const nextSubjects = userCycle?.ciclo_atual
    ? subjects
        .filter(subject => {
          // Deve estar no ciclo atual
          const isInCycle = userCycle.ciclo_atual.includes(subject.id);
          // NÃO deve estar na fila do dia
          const isNotInDailyQueue = !userCycle.disciplinas_do_dia.includes(subject.id);
          // NÃO deve estar concluída
          const isNotCompleted = subject.status !== 'Concluída';
          
          console.log('🔍 NextSubjects filter:', {
            subjectName: subject.name,
            subjectId: subject.id,
            status: subject.status,
            isInCycle,
            isNotInDailyQueue,
            isNotCompleted,
            willShow: isInCycle && isNotInDailyQueue && isNotCompleted
          });
          
          return isInCycle && isNotInDailyQueue && isNotCompleted;
        })
        .sort((a, b) => (a.priority || 999) - (b.priority || 999))
        .slice(0, 3)
    : [];

  // CORREÇÃO: Lógica melhorada para day completed
  const allDaySubjectsCompleted = userCycle && 
    userCycle.disciplinas_do_dia.length > 0 && // Havia matérias na fila do dia
    dailySubjects.length === 0 && // Agora não há mais matérias na fila
    !allStudiesCompleted && // Nem todos os estudos estão completos
    !currentCycleCompleted && // Nem o ciclo atual está completo
    !isRefreshing;

  console.log('🎯 useStudyPlanLogic - FINAL STATE CHECK:', {
    allStudiesCompleted,
    allDaySubjectsCompleted,
    currentCycleCompleted,
    dailySubjectsLength: dailySubjects.length,
    nextSubjectsLength: nextSubjects.length,
    hasAvailableSubjects,
    disciplinasIniciadas: disciplinasIniciadasNoCiclo,
    disciplinasNaoIniciadas: disciplinasNaoIniciadas.length,
    totalDisciplinasCiclo,
    disciplinasConcluidasNoCiclo,
    isRefreshing,
    dailyQueueLength: userCycle?.disciplinas_do_dia?.length || 0
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

      // CORREÇÃO CRÍTICA: Atualização otimizada dos dados
      await refreshData();

      // Atualizar o estado local do ciclo
      if (user) {
        const updatedCycle = await loadUserCycle(user.id);
        setUserCycle(updatedCycle);
      }

    } catch (error) {
      console.error('Error completing session:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao concluir sessão');
    } finally {
      setIsRefreshing(false);
    }
  }, [tempMarkedTopics, subjects, refreshData, user, isRefreshing]);

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
    disciplinasConcluidas: disciplinasConcluidasNoCiclo,
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
