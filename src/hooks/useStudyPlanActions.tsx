
import { UserCycle } from '@/types';

export const useStudyPlanActions = (
  userCycle: UserCycle | null,
  setUserCycle: any,
  setShowNewCycleMessage: any,
  baseHandleNextDay: any,
  baseHandleCompleteSession: any,
  tempMarkedTopics: Record<string, string[]>,
  setTempMarkedTopics: any,
  markAsSessionUpdate: () => void
) => {
  // Wrapper function that provides the required parameters to the base handleNextDay
  const handleNextDay = () => {
    if (!userCycle) return;
    return baseHandleNextDay(userCycle, setUserCycle, setShowNewCycleMessage, () => {});
  };

  const handleCompleteSession = (subjectId: string) => {
    return baseHandleCompleteSession(
      subjectId,
      userCycle!,
      tempMarkedTopics,
      setUserCycle,
      setTempMarkedTopics,
      markAsSessionUpdate
    );
  };

  return {
    handleNextDay,
    handleCompleteSession
  };
};
