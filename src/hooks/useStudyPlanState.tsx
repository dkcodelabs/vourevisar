
import { useApp } from '@/contexts/AppContext';
import { useCycleManagement } from './useCycleManagement';
import { useSubjectFiltering } from './useSubjectFiltering';
import { useStudySession } from './useStudySession';
import { useTopicActions } from './useTopicActions';

export const useStudyPlanState = () => {
  const { subjects, userSettings } = useApp();

  // Usar os hooks compostos
  const {
    userCycle,
    setUserCycle,
    isCycleCompleted,
    isStartingNewCycle,
    isCycleLoading,
    showNewCycleMessage,
    setShowNewCycleMessage,
    showNewCycleStarted,
    handleStartNewCycle,
    handleHideNewCycleMessage
  } = useCycleManagement(subjects, userSettings);

  const {
    disciplinasIniciadas,
    disciplinasNaoIniciadas,
    hasAvailableSubjects,
    totalDisciplinasCiclo,
    disciplinasConcluidas,
    disciplinasIniciadasCiclo,
    dailySubjects,
    nextSubjects,
    nextCycleSubjects,
    subjectsByStatus,
    allDaySubjectsCompleted,
    allStudiesCompleted,
    allTopicsInReview
  } = useSubjectFiltering(subjects, userCycle, userSettings);

  const {
    expandedSubject,
    setExpandedSubject,
    isNextDayLoading,
    handleNextDay: baseHandleNextDay,
    handleCompleteSession: baseHandleCompleteSession,
    handleToggleExpand
  } = useStudySession();

  const {
    tempMarkedTopics,
    setTempMarkedTopics,
    handleMarkTopicForReview,
    handleCancelTopicReview
  } = useTopicActions();

  return {
    // Cycle management
    userCycle,
    setUserCycle,
    isCycleCompleted,
    isStartingNewCycle,
    isCycleLoading,
    showNewCycleMessage,
    setShowNewCycleMessage,
    showNewCycleStarted,
    handleStartNewCycle,
    handleHideNewCycleMessage,
    
    // Subject filtering
    disciplinasIniciadas,
    disciplinasNaoIniciadas,
    hasAvailableSubjects,
    totalDisciplinasCiclo,
    disciplinasConcluidas,
    disciplinasIniciadasCiclo,
    dailySubjects,
    nextSubjects,
    nextCycleSubjects,
    subjectsByStatus,
    allDaySubjectsCompleted,
    allStudiesCompleted,
    allTopicsInReview,
    
    // Study session
    expandedSubject,
    setExpandedSubject,
    isNextDayLoading,
    baseHandleNextDay,
    baseHandleCompleteSession,
    handleToggleExpand,
    
    // Topic actions
    tempMarkedTopics,
    setTempMarkedTopics,
    handleMarkTopicForReview,
    handleCancelTopicReview
  };
};
