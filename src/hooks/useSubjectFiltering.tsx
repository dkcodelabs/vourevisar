
import { useMemo } from 'react';
import { Subject, UserCycle } from '@/types';
import { checkAllStudiesCompleted, hasStudyableSubjects } from '@/utils/studiesCompletionChecker';

export const useSubjectFiltering = (subjects: Subject[], userCycle: UserCycle | null, userSettings: { subjects_per_day: number } | null) => {
  const disciplinasIniciadas = subjects.filter(s => s.status === 'Em Estudo');
  const disciplinasNaoIniciadas = subjects.filter(s => s.status === 'Nova');
  const hasAvailableSubjects = hasStudyableSubjects(subjects);

  const totalDisciplinasCiclo = userCycle?.ciclo_atual?.length || 0;
  
  const disciplinasConcluidas = userCycle?.ciclo_atual?.filter(id => {
    const subject = subjects.find(s => s.id === id);
    return subject?.status === 'Concluída';
  }).length || 0;

  const disciplinasIniciadasCiclo = userCycle?.ciclo_atual?.filter(id => {
    const subject = subjects.find(s => s.id === id);
    return subject?.status === 'Em Estudo';
  }).length || 0;

  const isNewCycleStarted = userCycle && userCycle.ciclo_atual.length > 0 && 
    !userCycle.data_fim_ciclo && userCycle.disciplinas_do_dia.length === 0;

  // Filtrar matérias diárias
  const dailySubjects = useMemo(() => {
    if (!userCycle?.disciplinas_do_dia || userCycle.disciplinas_do_dia.length === 0) return [];
    
    return subjects.filter(subject => {
      const isInDailyList = userCycle.disciplinas_do_dia.includes(subject.id);
      const isNotCompleted = subject.status !== 'Concluída';
      const hasTopics = subject.topics && subject.topics.length > 0;
      const hasUnreviewedTopics = subject.topics && subject.topics.some(t => t.review_count === 0);
      
      return isInDailyList && isNotCompleted && hasTopics && hasUnreviewedTopics;
    }).sort((a, b) => {
      const indexA = userCycle.disciplinas_do_dia.indexOf(a.id);
      const indexB = userCycle.disciplinas_do_dia.indexOf(b.id);
      return indexA - indexB;
    });
  }, [subjects, userCycle?.disciplinas_do_dia]);

  // CORRIGIDO: Filtrar próximas matérias excluindo as que já estão em disciplinas_do_dia ou foram processadas
  const nextSubjects = useMemo(() => {
    if (!userCycle?.ciclo_atual || userCycle.ciclo_atual.length === 0) return [];
    
    return userCycle.ciclo_atual
      .filter(id => {
        const subject = subjects.find(s => s.id === id);
        if (!subject || subject.status === 'Concluída' || !subject.topics || subject.topics.length === 0) {
          return false;
        }
        
        // NOVO: Não incluir se já está nas disciplinas do dia (mesmo que vazio)
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

  const allStudiesCompleted = subjects.length > 0 ? checkAllStudiesCompleted(subjects) : false;

  // NOVO: Detectar quando o ciclo foi completamente concluído
  const isCycleCompleted = useMemo(() => {
    if (!userCycle || !userCycle.ciclo_atual || userCycle.ciclo_atual.length === 0) return false;
    
    // Verificar se todas as matérias do ciclo atual foram processadas
    const availableSubjectsInCycle = userCycle.ciclo_atual.filter(id => {
      const subject = subjects.find(s => s.id === id);
      if (!subject || subject.status === 'Concluída' || !subject.topics || subject.topics.length === 0) {
        return false;
      }
      return subject.topics.some(t => t.review_count === 0);
    });
    
    console.log('🔍 Verificando se ciclo está completo:', {
      ciclo_atual_length: userCycle.ciclo_atual.length,
      availableSubjectsInCycle: availableSubjectsInCycle.length,
      disciplinas_do_dia_length: userCycle.disciplinas_do_dia.length,
      nextSubjects_length: nextSubjects.length
    });
    
    return availableSubjectsInCycle.length === 0 && userCycle.disciplinas_do_dia.length === 0;
  }, [userCycle, subjects, nextSubjects.length]);

  // Verificações de estado atualizadas
  const allTopicsInReview = subjects.length > 0 && 
    subjects.some(s => s.topics && s.topics.some(t => t.review_count > 0)) &&
    dailySubjects.length === 0 && 
    nextSubjects.length === 0 &&
    userCycle && userCycle.ciclo_atual.length > 0 &&
    !isCycleCompleted;

  const allDaySubjectsCompleted = userCycle && 
    userCycle.disciplinas_do_dia.length === 0 &&
    userCycle.ciclo_atual.length > 0 &&
    !allStudiesCompleted &&
    !isCycleCompleted &&
    nextSubjects.length > 0;

  return {
    disciplinasIniciadas,
    disciplinasNaoIniciadas,
    hasAvailableSubjects,
    totalDisciplinasCiclo,
    disciplinasConcluidas,
    disciplinasIniciadasCiclo,
    isNewCycleStarted,
    dailySubjects,
    nextSubjects,
    allStudiesCompleted,
    allTopicsInReview,
    allDaySubjectsCompleted,
    isCycleCompleted
  };
};
