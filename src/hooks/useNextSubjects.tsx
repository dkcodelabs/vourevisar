
import { useMemo } from 'react';
import { Subject, UserCycle } from '@/types';

export const useNextSubjects = (subjects: Subject[], userCycle: UserCycle | null, userSettings: { subjects_per_day: number } | null) => {
  const nextSubjects = useMemo(() => {
    if (!userCycle?.ciclo_atual || userCycle.ciclo_atual.length === 0) return [];
    
    return userCycle.ciclo_atual
      .filter(id => {
        const subject = subjects.find(s => s.id === id);
        if (!subject || subject.status === 'Concluída' || !subject.topics || subject.topics.length === 0) {
          return false;
        }
        
        // Não incluir se já está nas disciplinas do dia
        if (userCycle.disciplinas_do_dia.includes(id)) {
          return false;
        }
        
        const hasUnreviewedTopics = subject.topics.some(t => t.review_count === 0);
        return hasUnreviewedTopics;
      })
      .slice(0, userSettings?.subjects_per_day || 3)
      .map(id => subjects.find(s => s.id === id))
      .filter(Boolean);
  }, [subjects, userCycle, userSettings]);

  return { nextSubjects };
};
