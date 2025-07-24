
import { useMemo } from 'react';
import { Subject, UserCycle } from '@/types';
import { useOptimizedChecks } from './useOptimizedChecks';

export const useCycleStatus = (
  subjects: Subject[], 
  userCycle: UserCycle | null, 
  dailySubjectsLength: number, 
  nextSubjectsLength: number
) => {
  const { allStudiesCompleted, allTopicsInReview } = useOptimizedChecks(subjects);


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
      
      const hasUnreviewedTopics = subject.topics.some(topic => {
        const reviewCount = topic.reviewCount || topic.review_count || 0;
        return reviewCount === 0;
      });
      
      return hasUnreviewedTopics;
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
      
      const hasUnreviewedTopics = subject.topics.some(topic => {
        const reviewCount = topic.reviewCount || topic.review_count || 0;
        return reviewCount === 0;
      });
      
      return hasUnreviewedTopics;
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
    
    // Verificar se há matérias disponíveis no ciclo atual OU fora do ciclo (para não confundir com fim de estudos)
    const availableSubjectsInCycle = userCycle.ciclo_atual?.filter(id => {
      const subject = subjects.find(s => s.id === id);
      if (!subject || subject.status === 'Concluída') return false;
      if (!subject.topics || subject.topics.length === 0) return false;
      
      const hasUnreviewedTopics = subject.topics.some(topic => {
        const reviewCount = topic.reviewCount || topic.review_count || 0;
        return reviewCount === 0;
      });
      
      return hasUnreviewedTopics;
    }) || [];

    // Verificar matérias fora do ciclo atual também
    const availableSubjectsOutsideCycle = subjects.filter(subject => {
      if (subject.status === 'Concluída') return false;
      if (!subject.topics || subject.topics.length === 0) return false;
      if (userCycle.ciclo_atual?.includes(subject.id)) return false;
      
      const hasUnreviewedTopics = subject.topics.some(topic => {
        const reviewCount = topic.reviewCount || topic.review_count || 0;
        return reviewCount === 0;
      });
      
      return hasUnreviewedTopics;
    });

    const hasAvailableSubjects = availableSubjectsInCycle.length > 0 || availableSubjectsOutsideCycle.length > 0;
    
    console.log('🔍 Verificando allDaySubjectsCompleted - LÓGICA CORRIGIDA:', {
      noDailySubjects,
      hasAvailableSubjects,
      availableInCycle: availableSubjectsInCycle.length,
      availableOutsideCycle: availableSubjectsOutsideCycle.length,
      isCycleCompleted,
      allStudiesCompleted,
      allTopicsInReview,
      userCycle_disciplinas_do_dia_length: userCycle.disciplinas_do_dia.length,
      result: noDailySubjects && hasAvailableSubjects && !allStudiesCompleted && !allTopicsInReview
    });
    
    // Dia está completo se:
    // 1. Não há matérias do dia (lista vazia) E
    // 2. Há matérias disponíveis (não é fim de todos os estudos) E  
    // 3. Não é fim de todos os estudos E
    // 4. Não é situação de todos os tópicos em revisão
    return noDailySubjects && 
           hasAvailableSubjects && 
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
