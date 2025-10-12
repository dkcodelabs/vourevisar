
import { useMemo } from 'react';
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
  const { isSubjectStudied } = useCycleStatus();

  // Nova seção: matérias disponíveis para próximo ciclo
  const nextCycleSubjects = useMemo(() => {
    if (!userCycle?.materias_pendentes || userCycle.materias_pendentes.length === 0) return [];
    
    return subjects.filter(subject => {
      const isInPendingList = userCycle.materias_pendentes.includes(subject.id);
      const isNotCompleted = subject.status !== 'Concluída';
      const hasTopics = subject.topics && subject.topics.length > 0;
      
      return isInPendingList && isNotCompleted && hasTopics;
    }).sort((a, b) => {
      const indexA = userCycle.materias_pendentes.indexOf(a.id);
      const indexB = userCycle.materias_pendentes.indexOf(b.id);
      return indexA - indexB;
    });
  }, [subjects, userCycle?.materias_pendentes]);

  return {
    ...cycleStats,
    dailySubjects,
    nextSubjects,
    nextCycleSubjects,
    subjectsByStatus,
    isSubjectStudied
  };
};
