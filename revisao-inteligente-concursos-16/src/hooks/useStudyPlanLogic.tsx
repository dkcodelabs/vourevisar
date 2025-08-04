
import { useStudyPlanState } from './useStudyPlanState';
import { useStudyPlanActions } from './useStudyPlanActions';
import { useTopicReview } from './useTopicReview';

export const useStudyPlanLogic = () => {
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
    handleHideNewCycleMessage,
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
    expandedSubject,
    isNextDayLoading,
    baseHandleNextDay,
    baseHandleCompleteSession,
    handleToggleExpand,
    tempMarkedTopics,
    setTempMarkedTopics,
    handleMarkTopicForReview,
    handleCancelTopicReview
  } = useStudyPlanState();

  const { handleNextDay, handleCompleteSession } = useStudyPlanActions(
    userCycle,
    setUserCycle,
    setShowNewCycleMessage,
    baseHandleNextDay,
    baseHandleCompleteSession,
    tempMarkedTopics,
    setTempMarkedTopics
  );

  const { markTopicAsReviewed, isLoading } = useTopicReview();

  return {
    expandedSubject,
    tempMarkedTopics,
    showNewCycleMessage,
    userCycle,
    dailySubjects,
    nextSubjects,
    nextCycleSubjects,
    subjectsByStatus,
    allDaySubjectsCompleted,
    hasAvailableSubjects,
    totalDisciplinasCiclo,
    disciplinasConcluidas,
    allStudiesCompleted,
    handleNextDay,
    handleCompleteSession,
    handleToggleExpand,
    handleMarkTopicForReview,
    handleCancelTopicReview,
    disciplinasIniciadas,
    disciplinasNaoIniciadas,
    disciplinasIniciadasCiclo,
    isCycleCompleted,
    handleStartNewCycle,
    isNextDayLoading,
    showNewCycleStarted,
    allTopicsInReview,
    isCycleLoading,
    isStartingNewCycle,
    markTopicAsReviewed,
    isLoading
  };
};
