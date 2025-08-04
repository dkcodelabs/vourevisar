
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
  const cycleStatus = useCycleStatus(subjects, userCycle, dailySubjects.length, nextSubjects.length);

  // CORREÇÃO FINAL: Seção "Disponíveis para Próximo Ciclo" - apenas matérias pendentes
  const nextCycleSubjects = useMemo(() => {
    if (!userCycle || !userCycle.materias_pendentes || userCycle.materias_pendentes.length === 0) {
      return [];
    }
    
    // Mostrar APENAS as matérias que estão em materias_pendentes
    // (matérias que foram concluídas e saíram do ciclo atual)
    const pendingSubjects = userCycle.materias_pendentes || [];
    
    console.log('🔍 Filtrando matérias para próximo ciclo:', {
      materias_pendentes: pendingSubjects.length,
      materias_pendentes_nomes: pendingSubjects.map(id => subjects.find(s => s.id === id)?.name || 'NOT_FOUND')
    });
    
    // CORREÇÃO: Manter a ordem cronológica das matérias pendentes
    // A ordem no array materias_pendentes representa a ordem de adição
    return pendingSubjects
      .map(id => subjects.find(s => s.id === id))
      .filter(subject => {
        if (!subject) return false;
        
        const isNotCompleted = subject.status !== 'Concluída';
        const hasTopics = subject.topics && subject.topics.length > 0;
        
        const isValid = isNotCompleted && hasTopics;
        
        console.log(`🔍 Matéria pendente "${subject.name}":`, {
          isInPendingList: true,
          isNotCompleted,
          hasTopics,
          isValid,
          status: subject.status,
          topicsCount: subject.topics?.length || 0,
          ordem_cronologica: pendingSubjects.indexOf(subject.id) + 1
        });
        
        return isValid;
      });
  }, [subjects, userCycle?.materias_pendentes]);

  return {
    ...cycleStats,
    dailySubjects,
    nextSubjects,
    nextCycleSubjects,
    subjectsByStatus,
    ...cycleStatus
  };
};
