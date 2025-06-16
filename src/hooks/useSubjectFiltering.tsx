
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

  // Filtrar próximas matérias - APENAS as que estão no ciclo_atual e não estão nas disciplinas_do_dia
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

  const allStudiesCompleted = subjects.length > 0 ? checkAllStudiesCompleted(subjects) : false;

  // CORRIGIDO: Detectar quando o ciclo foi completamente concluído
  const isCycleCompleted = useMemo(() => {
    if (!userCycle) return false;
    
    // Se o ciclo_atual está vazio (todas as matérias foram processadas)
    const cicloAtualEmpty = !userCycle.ciclo_atual || userCycle.ciclo_atual.length === 0;
    
    // Se disciplinas_do_dia também está vazio
    const disciplinasDoDiaEmpty = !userCycle.disciplinas_do_dia || userCycle.disciplinas_do_dia.length === 0;
    
    console.log('🔍 Verificando se ciclo está completo:', {
      cicloAtualEmpty,
      disciplinasDoDiaEmpty,
      ciclo_atual_length: userCycle.ciclo_atual?.length || 0,
      disciplinas_do_dia_length: userCycle.disciplinas_do_dia?.length || 0,
      nextSubjects_length: nextSubjects.length
    });
    
    // Ciclo está completo se ambos estão vazios
    return cicloAtualEmpty && disciplinasDoDiaEmpty;
  }, [userCycle, nextSubjects.length]);

  // CORRIGIDO: Verificação mais rigorosa para "allTopicsInReview"
  const allTopicsInReview = useMemo(() => {
    if (subjects.length === 0) return false;
    
    // Primeiro, verificar se existem matérias com tópicos
    const subjectsWithTopics = subjects.filter(s => s.topics && s.topics.length > 0);
    if (subjectsWithTopics.length === 0) return false;
    
    // Verificar se TODOS os tópicos não concluídos já iniciaram revisão (review_count > 0)
    const allUnfinishedTopicsInReview = subjectsWithTopics.every(subject => {
      if (subject.status === 'Concluída') return true; // Matérias concluídas não contam
      
      const unfinishedTopics = subject.topics.filter(t => !t.completed && t.review_stage !== 'Concluído');
      if (unfinishedTopics.length === 0) return true; // Se não há tópicos não concluídos, está ok
      
      // TODOS os tópicos não concluídos devem ter iniciado revisão
      return unfinishedTopics.every(t => t.review_count > 0);
    });
    
    // Deve ter pelo menos um tópico em revisão E não ter matérias para estudar hoje
    const hasTopicsInReview = subjects.some(s => 
      s.topics && s.topics.some(t => t.review_count > 0 && !t.completed)
    );
    
    console.log('🔍 Verificando allTopicsInReview:', {
      subjectsWithTopics: subjectsWithTopics.length,
      allUnfinishedTopicsInReview,
      hasTopicsInReview,
      dailySubjectsLength: dailySubjects.length,
      nextSubjectsLength: nextSubjects.length,
      result: allUnfinishedTopicsInReview && hasTopicsInReview && dailySubjects.length === 0 && nextSubjects.length === 0
    });
    
    return allUnfinishedTopicsInReview && 
           hasTopicsInReview && 
           dailySubjects.length === 0 && 
           nextSubjects.length === 0 &&
           !isCycleCompleted;
  }, [subjects, dailySubjects.length, nextSubjects.length, isCycleCompleted]);

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
