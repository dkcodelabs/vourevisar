import { useMemo } from 'react';
import { Subject, UserCycle } from '@/types';

export interface SubjectView {
  subject: Subject;
  viewNumber: number;
  cycleIndex: number;
}

export const useDailySubjectsWithViews = (subjects: Subject[], userCycle: UserCycle | null) => {
  const dailySubjectsWithViews = useMemo(() => {
    if (!userCycle?.disciplinas_do_dia || !userCycle?.ciclo_atual) {
      return [];
    }

    // Console.log removido para evitar spam

    const views: SubjectView[] = [];
    
    // Para cada disciplina do dia, encontrar sua posição no ciclo_atual
    // e determinar qual visualização é (1ª, 2ª, 3ª, etc)
    userCycle.disciplinas_do_dia.forEach(subjectId => {
      const subject = subjects.find(s => s.id === subjectId);
      if (!subject) return;

      // Como a duplicação foi removida, viewNumber é sempre 1
      // Encontrar a primeira ocorrência no ciclo para o cycleIndex
      const cycleIndex = userCycle.ciclo_atual.indexOf(subjectId);
      
      views.push({
        subject,
        viewNumber: 1,
        cycleIndex: cycleIndex !== -1 ? cycleIndex : 0
      });
    });

    // Console.log removido para evitar spam
    return views;
  }, [subjects, userCycle]);

  return dailySubjectsWithViews;
};
