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

      // Contar quantas vezes esta matéria aparece no ciclo_atual até agora
      let viewNumber = 1;
      for (let i = 0; i < userCycle.ciclo_atual.length; i++) {
        if (userCycle.ciclo_atual[i] === subjectId) {
          // Verificar se esta é a visualização que está nas disciplinas do dia
          // Assumindo que as disciplinas do dia são selecionadas na ordem do ciclo_atual
          const isDailyView = userCycle.disciplinas_do_dia.indexOf(subjectId) !== -1;
          if (isDailyView) {
            views.push({
              subject,
              viewNumber,
              cycleIndex: i
            });
            break; // Encontramos a visualização correspondente
          }
          viewNumber++;
        }
      }
    });

    // Console.log removido para evitar spam
    return views;
  }, [subjects, userCycle]);

  return dailySubjectsWithViews;
};
