
import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { syncSubjectStatus } from '@/utils/studiesCompletionChecker';
import { supabase } from '@/integrations/supabase/client';
import { useCycleManagement } from './useCycleManagement';
import { useTopicActions } from './useTopicActions';
import { useStudySession } from './useStudySession';
import { useSubjectFiltering } from './useSubjectFiltering';

export const useStudyPlanLogic = () => {
  const { subjects, isLoading: isAppLoading, refreshData } = useApp();
  const { user } = useAuth();
  const [userSettings, setUserSettings] = useState<{ subjects_per_day: number } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Load user settings with immediate fallback
  useEffect(() => {
    const fetchUserSettings = async () => {
      if (!user) return;

      setUserSettings({ subjects_per_day: 3 });

      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('subjects_per_day')
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          setUserSettings(data);
        }
      } catch (error) {
        console.error('Error fetching user settings:', error);
      }
    };

    fetchUserSettings();
  }, [user]);

  // Usar os hooks especializados
  const cycleManagement = useCycleManagement(subjects, userSettings);
  const topicActions = useTopicActions();
  const studySession = useStudySession();
  const subjectFiltering = useSubjectFiltering(subjects, cycleManagement.userCycle, userSettings);

  // Verificar se deve iniciar novo ciclo automaticamente após carregar dados
  useEffect(() => {
    if (isInitialized && cycleManagement.userCycle && userSettings && !cycleManagement.isStartingNewCycle) {
      cycleManagement.autoStartNewCycle();
    }
  }, [isInitialized, cycleManagement.userCycle, userSettings, cycleManagement.isStartingNewCycle, cycleManagement.autoStartNewCycle]);

  // Marcar como inicializado quando ciclo carregar
  useEffect(() => {
    if (!cycleManagement.isCycleLoading) {
      setIsInitialized(true);
    }
  }, [cycleManagement.isCycleLoading]);

  // Sincronização periódica dos status das matérias
  useEffect(() => {
    if (subjects.length > 0 && cycleManagement.userCycle) {
      syncSubjectStatus(subjects);
    }
  }, [subjects, cycleManagement.userCycle]);

  // Verificação de estudos completos
  useEffect(() => {
    if (subjectFiltering.allStudiesCompleted) {
      setTimeout(() => refreshData(), 1000);
    }
  }, [subjectFiltering.allStudiesCompleted, refreshData]);

  const isLoading = isAppLoading || cycleManagement.isStartingNewCycle;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Funcionalidade temporariamente desabilitada");
    setIsAdding(false);
  };

  // Adaptar as funções para usar os novos hooks
  const handleNextDay = () => studySession.handleNextDay(
    cycleManagement.userCycle!, 
    cycleManagement.setUserCycle, 
    cycleManagement.setShowNewCycleMessage, 
    () => {}
  );

  const handleCompleteSession = (subjectId: string) => {
    studySession.handleCompleteSession(
      subjectId, 
      cycleManagement.userCycle!, 
      topicActions.tempMarkedTopics, 
      cycleManagement.setUserCycle, 
      topicActions.setTempMarkedTopics
    );
    studySession.setExpandedSubject('');
  };

  const markTopicAsReviewed = (topicId: string) => topicActions.markTopicAsReviewed(topicId, subjects);

  console.log('🎯 useStudyPlanLogic - Estado final:', {
    allStudiesCompleted: subjectFiltering.allStudiesCompleted,
    allDaySubjectsCompleted: subjectFiltering.allDaySubjectsCompleted,
    allTopicsInReview: subjectFiltering.allTopicsInReview,
    dailySubjectsLength: subjectFiltering.dailySubjects.length,
    nextSubjectsLength: subjectFiltering.nextSubjects.length,
    isCycleLoading: cycleManagement.isCycleLoading
  });

  return {
    isLoading,
    expandedSubject: studySession.expandedSubject,
    tempMarkedTopics: topicActions.tempMarkedTopics,
    showNewCycleMessage: cycleManagement.showNewCycleMessage,
    userCycle: cycleManagement.userCycle,
    dailySubjects: subjectFiltering.dailySubjects,
    nextSubjects: subjectFiltering.nextSubjects,
    allDaySubjectsCompleted: subjectFiltering.allDaySubjectsCompleted,
    hasAvailableSubjects: subjectFiltering.hasAvailableSubjects,
    totalDisciplinasCiclo: subjectFiltering.totalDisciplinasCiclo,
    disciplinasConcluidas: subjectFiltering.disciplinasConcluidas,
    isNewCycleStarted: subjectFiltering.isNewCycleStarted,
    allStudiesCompleted: subjectFiltering.allStudiesCompleted,
    handleNextDay,
    handleCompleteSession,
    handleToggleExpand: studySession.handleToggleExpand,
    handleMarkTopicForReview: topicActions.handleMarkTopicForReview,
    handleCancelTopicReview: topicActions.handleCancelTopicReview,
    handleHideNewCycleMessage: cycleManagement.handleHideNewCycleMessage,
    disciplinasIniciadas: subjectFiltering.disciplinasIniciadas,
    disciplinasNaoIniciadas: subjectFiltering.disciplinasNaoIniciadas,
    disciplinasIniciadasCiclo: subjectFiltering.disciplinasIniciadasCiclo,
    isCycleCompleted: cycleManagement.isCycleCompleted,
    handleStartNewCycle: cycleManagement.handleStartNewCycle,
    isAdding,
    handleSubmit,
    isNextDayLoading: studySession.isNextDayLoading,
    isCycleLoading: cycleManagement.isCycleLoading,
    showNewCycleStarted: cycleManagement.showNewCycleStarted,
    markTopicAsReviewed,
    allTopicsInReview: subjectFiltering.allTopicsInReview
  };
};
