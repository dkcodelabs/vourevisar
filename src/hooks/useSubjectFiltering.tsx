
import { useCycleSubjectStats } from './useCycleSubjectStats';
import { useDailySubjects } from './useDailySubjects';
import { useNextSubjects } from './useNextSubjects';
import { useCycleStatus } from './useCycleStatus';
import { Subject, UserCycle } from '@/types';

export const useSubjectFiltering = (subjects: Subject[], userCycle: UserCycle | null, userSettings: { subjects_per_day: number } | null) => {
  // Use the specialized hooks
  const cycleStats = useCycleSubjectStats(subjects, userCycle);
  const { dailySubjects } = useDailySubjects(subjects, userCycle);
  const { nextSubjects, subjectsByStatus } = useNextSubjects(subjects, userCycle, userSettings);
  const cycleStatus = useCycleStatus(subjects, userCycle, dailySubjects.length, nextSubjects.length);

  return {
    ...cycleStats,
    dailySubjects,
    nextSubjects,
    subjectsByStatus,
    ...cycleStatus
  };
};
