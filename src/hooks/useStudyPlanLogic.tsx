
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserCycle } from '@/types';
import { toast } from 'sonner';
import { generateNextDay, loadUserCycle } from '@/utils/cycleUtils';
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

  // Debug log dos subjects carregados
  useEffect(() => {
    console.log('📚 useStudyPlanLogic - Subjects loaded:', {
      subjectsCount: subjects.length,
      subjects: subjects.map(s => ({ id: s.id, name: s.name, status: s.status })),
      isLoading
    });
  }, [subjects, isLoading]);

  // Sincronização periódica dos status das matérias
  useEffect(() => {
    if (subjects.length > 0) {
      syncSubjectStatus(subjects);
    }
  }, [subjects]);

  // Check for all studies completed - lógica melhorada e persistente
  useEffect(() => {
    if (subjects.length > 0) {
      const allCompleted = checkAllStudiesCompleted(subjects);
      console.log('🎯 useStudyPlanLogic - Setting allStudiesCompleted:', allCompleted);
      setAllStudiesCompleted(allCompleted);
      
      // Se todos os estudos estão completos, refresh dos dados para garantir consistência
      if (allCompleted) {
        console.log('🎯 Todos os estudos completos - fazendo refresh dos dados');
        setTimeout(() => refreshData(), 1000);
      }
    } else {
      console.log('🎯 useStudyPlanLogic - No subjects found, setting allStudiesCompleted to false');
      setAllStudiesCompleted(false);
    }
  }, [subjects, refreshData]);

  // Debug log when allStudiesCompleted changes
  useEffect(() => {
    console.log('🎯 useStudyPlanLogic - allStudiesCompleted state changed:', allStudiesCompleted);
  }, [allStudiesCompleted]);

  // Load user cycle
  useEffect(() => {
    const loadCycle = async () => {
      if (!user) return;

      try {
        const data = await loadUserCycle(user.id);
        console.log('🔄 useStudyPlanLogic - User cycle loaded:', data);
        setUserCycle(data);
      } catch (error) {
        console.error('Exception loading user cycle:', error);
      }
    };

    loadCycle();
  }, [user]);

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

  // Lógica melhorada para day completed - só mostra se não estão todos os estudos completos
  const allDaySubjectsCompleted = dailySubjects.length === 0 && 
    userCycle && 
    userCycle.disciplinas_do_dia.length > 0 &&
    !allStudiesCompleted;

  console.log('🎯 useStudyPlanLogic - Render state:', {
    allStudiesCompleted,
    allDaySubjectsCompleted,
    subjectsLength: subjects.length,
    dailySubjectsLength: dailySubjects.length,
    hasAvailableSubjects,
    disciplinasIniciadas: disciplinasIniciadas.length,
    disciplinasNaoIniciadas: disciplinasNaoIniciadas.length,
    totalDisciplinasCiclo,
    disciplinasConcluidas,
    disciplinasIniciadasNoCiclo
  });

  const handleNextDay = useCallback(async () => {
    if (!user || !userCycle) return;

    try {
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
    }
  }, [user, userCycle, subjects]);

  const handleCompleteSession = useCallback(async (subjectId: string) => {
    const markedTopics = tempMarkedTopics[subjectId] || [];
    
    try {
      const result = await completeStudySession(subjectId, markedTopics, subjects);
      
      if (result.subjectCompleted) {
        toast.success(`Matéria "${result.subjectName}" concluída! 🎉`);
        
        // Refresh dos dados para garantir que a interface seja atualizada
        setTimeout(() => refreshData(), 500);
      }

      // Clear temp marked topics
      setTempMarkedTopics(prev => ({
        ...prev,
        [subjectId]: []
      }));

      setExpandedSubject('');
      toast.success('Sessão concluída com sucesso!');

    } catch (error) {
      console.error('Error completing session:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao concluir sessão');
    }
  }, [tempMarkedTopics, subjects, refreshData]);

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
    isLoading,
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
    handleNextDay,
    handleCompleteSession,
    handleToggleExpand,
    handleMarkTopicForReview,
    handleCancelTopicReview,
    handleHideNewCycleMessage,
    disciplinasIniciadas: disciplinasIniciadasNoCiclo, // Use the correct calculation
    disciplinasNaoIniciadas: disciplinasNaoIniciadas.length,
    isTopicDominated
  };
};
