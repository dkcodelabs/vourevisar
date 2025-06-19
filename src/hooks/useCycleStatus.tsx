
import { useMemo } from 'react';
import { Subject, UserCycle } from '@/types';
import { checkAllStudiesCompleted } from '@/utils/studiesCompletionChecker';

export const useCycleStatus = (
  subjects: Subject[], 
  userCycle: UserCycle | null, 
  dailySubjectsLength: number, 
  nextSubjectsLength: number
) => {
  const allStudiesCompleted = subjects.length > 0 ? checkAllStudiesCompleted(subjects) : false;

  // CORRIGIDO: Detectar quando todos os tópicos disponíveis estão em revisão
  const allTopicsInReview = useMemo(() => {
    if (subjects.length === 0) return false;
    
    console.log('🔍 Verificando allTopicsInReview - análise completa:', {
      totalSubjects: subjects.length
    });
    
    // Verificar se existem matérias com tópicos não revisados (review_count === 0)
    const subjectsWithUnreviewedTopics = subjects.filter(subject => {
      if (subject.status === 'Concluída') return false;
      if (!subject.topics || subject.topics.length === 0) return false;
      return subject.topics.some(topic => topic.review_count === 0);
    });

    console.log('🔍 Matérias com tópicos NÃO REVISADOS:', {
      count: subjectsWithUnreviewedTopics.length,
      subjects: subjectsWithUnreviewedTopics.map(s => s.name)
    });

    // Se NÃO há matérias com tópicos não revisados, significa que todos os tópicos estão em revisão
    const allTopicsStartedReview = subjectsWithUnreviewedTopics.length === 0;
    
    // Verificar se há pelo menos um tópico em revisão
    const hasTopicsInReview = subjects.some(s => 
      s.topics && s.topics.some(t => t.review_count > 0 && !t.completed)
    );
    
    console.log('🔍 Estado final allTopicsInReview:', {
      allTopicsStartedReview,
      hasTopicsInReview,
      dailySubjectsLength,
      nextSubjectsLength,
      result: allTopicsStartedReview && hasTopicsInReview && dailySubjectsLength === 0 && nextSubjectsLength === 0
    });
    
    return allTopicsStartedReview && hasTopicsInReview && dailySubjectsLength === 0 && nextSubjectsLength === 0;
  }, [subjects, dailySubjectsLength, nextSubjectsLength]);

  // CORRIGIDO: Detectar quando o ciclo foi completamente concluído
  const isCycleCompleted = useMemo(() => {
    if (!userCycle) return false;
    
    console.log('🔍 Verificando se ciclo está completo - análise detalhada:', {
      ciclo_atual: userCycle.ciclo_atual,
      disciplinas_do_dia: userCycle.disciplinas_do_dia,
      dailySubjectsLength: dailySubjectsLength,
      nextSubjectsLength: nextSubjectsLength
    });

    // Verificar se existem matérias disponíveis com tópicos não revisados no ciclo atual
    const availableSubjectsInCurrentCycle = userCycle.ciclo_atual?.filter(id => {
      const subject = subjects.find(s => s.id === id);
      if (!subject || subject.status === 'Concluída') return false;
      if (!subject.topics || subject.topics.length === 0) return false;
      return subject.topics.some(topic => topic.review_count === 0);
    }) || [];

    console.log('🔍 Matérias disponíveis no ciclo atual:', {
      count: availableSubjectsInCurrentCycle.length,
      subjects: availableSubjectsInCurrentCycle.map(id => {
        const subject = subjects.find(s => s.id === id);
        return subject?.name || id;
      })
    });

    // Verificar se existem matérias FORA do ciclo atual que ainda podem ser estudadas
    const availableSubjectsOutsideCycle = subjects.filter(subject => {
      if (subject.status === 'Concluída') return false;
      if (!subject.topics || subject.topics.length === 0) return false;
      if (userCycle.ciclo_atual?.includes(subject.id)) return false; // Não está no ciclo atual
      return subject.topics.some(topic => topic.review_count === 0);
    });

    console.log('🔍 Matérias disponíveis FORA do ciclo atual:', {
      count: availableSubjectsOutsideCycle.length,
      subjects: availableSubjectsOutsideCycle.map(s => s.name)
    });

    const hasNoCurrentSubjects = dailySubjectsLength === 0 && nextSubjectsLength === 0;
    const hasNoSubjectsInCurrentCycle = availableSubjectsInCurrentCycle.length === 0;
    const hasSubjectsForNewCycle = availableSubjectsOutsideCycle.length > 0;
    
    // Ciclo está completo se:
    // 1. Não há matérias para estudar hoje/próximas E
    // 2. Não há mais matérias disponíveis no ciclo atual E
    // 3. Há matérias disponíveis para um novo ciclo (senão seria allTopicsInReview)
    const cycleCompleted = hasNoCurrentSubjects && hasNoSubjectsInCurrentCycle && hasSubjectsForNewCycle;
    
    console.log('🔍 Resultado da verificação de ciclo completo:', {
      hasNoCurrentSubjects,
      hasNoSubjectsInCurrentCycle,
      hasSubjectsForNewCycle,
      cycleCompleted
    });
    
    return cycleCompleted;
  }, [userCycle, dailySubjectsLength, nextSubjectsLength, subjects]);

  // NOVA LÓGICA CORRIGIDA: Detectar quando o dia foi concluído
  const allDaySubjectsCompleted = useMemo(() => {
    if (!userCycle) return false;
    
    // SIMPLES: Dia está completo quando não há mais matérias nas disciplinas_do_dia
    const noDailySubjects = userCycle.disciplinas_do_dia.length === 0;
    
    // Verificar se há matérias disponíveis no ciclo atual (para não confundir com fim de estudos)
    const availableSubjectsInCycle = userCycle.ciclo_atual?.filter(id => {
      const subject = subjects.find(s => s.id === id);
      if (!subject || subject.status === 'Concluída') return false;
      if (!subject.topics || subject.topics.length === 0) return false;
      return subject.topics.some(topic => topic.review_count === 0);
    }) || [];

    const hasAvailableSubjectsInCycle = availableSubjectsInCycle.length > 0;
    
    console.log('🔍 Verificando allDaySubjectsCompleted - LÓGICA CORRIGIDA:', {
      noDailySubjects,
      hasAvailableSubjectsInCycle,
      isCycleCompleted,
      allStudiesCompleted,
      allTopicsInReview,
      userCycle_disciplinas_do_dia_length: userCycle.disciplinas_do_dia.length,
      result: noDailySubjects && hasAvailableSubjectsInCycle && !isCycleCompleted && !allStudiesCompleted && !allTopicsInReview
    });
    
    // Dia está completo se:
    // 1. Não há matérias do dia (lista vazia) E
    // 2. Há matérias disponíveis no ciclo (não é fim de ciclo/estudos) E  
    // 3. Não é fim de todos os estudos E
    // 4. Não é situação de todos os tópicos em revisão
    return noDailySubjects && 
           hasAvailableSubjectsInCycle && 
           !isCycleCompleted && 
           !allStudiesCompleted && 
           !allTopicsInReview;
  }, [userCycle, subjects, isCycleCompleted, allStudiesCompleted, allTopicsInReview]);

  return {
    allStudiesCompleted,
    isCycleCompleted,
    allTopicsInReview,
    allDaySubjectsCompleted
  };
};
