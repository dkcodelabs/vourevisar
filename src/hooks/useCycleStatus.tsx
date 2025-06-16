
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

  // CORRIGIDO: Detectar quando o ciclo foi completamente concluído
  const isCycleCompleted = useMemo(() => {
    if (!userCycle) return false;
    
    console.log('🔍 Verificando se ciclo está completo - análise detalhada:', {
      ciclo_atual: userCycle.ciclo_atual,
      disciplinas_do_dia: userCycle.disciplinas_do_dia,
      dailySubjectsLength: dailySubjectsLength,
      nextSubjectsLength: nextSubjectsLength
    });

    // Verificar se existem matérias disponíveis com tópicos não revisados
    const availableSubjectsWithUnreviewedTopics = subjects.filter(subject => {
      if (subject.status === 'Concluída') return false;
      if (!subject.topics || subject.topics.length === 0) return false;
      return subject.topics.some(topic => topic.review_count === 0);
    });

    console.log('🔍 Matérias disponíveis com tópicos não revisados:', {
      count: availableSubjectsWithUnreviewedTopics.length,
      subjects: availableSubjectsWithUnreviewedTopics.map(s => s.name)
    });

    // NOVO: Ciclo está completo se:
    // 1. Não há matérias para hoje E
    // 2. Não há próximas matérias no ciclo E  
    // 3. Ainda existem matérias com tópicos não revisados (para novo ciclo)
    const hasNoCurrentSubjects = dailySubjectsLength === 0 && nextSubjectsLength === 0;
    const hasSubjectsForNewCycle = availableSubjectsWithUnreviewedTopics.length > 0;
    
    const cycleCompleted = hasNoCurrentSubjects && hasSubjectsForNewCycle;
    
    console.log('🔍 Resultado da verificação de ciclo completo:', {
      hasNoCurrentSubjects,
      hasSubjectsForNewCycle,
      cycleCompleted
    });
    
    return cycleCompleted;
  }, [userCycle, dailySubjectsLength, nextSubjectsLength, subjects]);

  // CORRIGIDO: Verificação mais rigorosa para "allTopicsInReview"
  const allTopicsInReview = useMemo(() => {
    if (subjects.length === 0) return false;
    
    // Primeiro, verificar se existem matérias com tópicos
    const subjectsWithTopics = subjects.filter(s => s.topics && s.topics.length > 0);
    if (subjectsWithTopics.length === 0) return false;
    
    // Verificar se TODOS os tópicos não concluídos já iniciaram revisão (review_count > 0)
    const allUnfinishedTopicsInReview = subjectsWithTopics.every(subject => {
      if (subject.status === 'Concluída') return true; // Matérias concluídas não contam
      
      const unfinishedTopics = subject.topics.filter(t => !t.completed && t.reviewStage !== 'Concluído');
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
      dailySubjectsLength: dailySubjectsLength,
      nextSubjectsLength: nextSubjectsLength,
      isCycleCompleted,
      result: allUnfinishedTopicsInReview && hasTopicsInReview && dailySubjectsLength === 0 && nextSubjectsLength === 0 && !isCycleCompleted
    });
    
    // CORRIGIDO: Só mostrar "allTopicsInReview" se NÃO estivermos em um ciclo completo
    return allUnfinishedTopicsInReview && 
           hasTopicsInReview && 
           dailySubjectsLength === 0 && 
           nextSubjectsLength === 0 &&
           !isCycleCompleted;
  }, [subjects, dailySubjectsLength, nextSubjectsLength, isCycleCompleted]);

  // CORRIGIDO: Detectar quando o dia foi concluído mas ainda há matérias no ciclo
  const allDaySubjectsCompleted = useMemo(() => {
    if (!userCycle) return false;
    
    // CORRIGIDO: Lógica mais simples e efetiva
    // Dia concluído quando:
    // 1. disciplinas_do_dia está vazio E
    // 2. Ainda há matérias disponíveis no ciclo_atual E
    // 3. Não é um ciclo completo E
    // 4. Não são todos os estudos completos
    
    const noDailySubjectsNow = dailySubjectsLength === 0;
    const hasAvailableSubjectsInCycle = userCycle.ciclo_atual.some(id => {
      const subject = subjects.find(s => s.id === id);
      return subject && 
             subject.status !== 'Concluída' && 
             subject.topics && subject.topics.length > 0 &&
             subject.topics.some(t => t.review_count === 0);
    });
    
    console.log('🔍 Verificando allDaySubjectsCompleted - NOVA LÓGICA:', {
      noDailySubjectsNow,
      hasAvailableSubjectsInCycle,
      isCycleCompleted,
      allStudiesCompleted,
      userCycle_disciplinas_do_dia: userCycle.disciplinas_do_dia,
      userCycle_ciclo_atual: userCycle.ciclo_atual,
      result: noDailySubjectsNow && hasAvailableSubjectsInCycle && !isCycleCompleted && !allStudiesCompleted
    });
    
    return noDailySubjectsNow && 
           hasAvailableSubjectsInCycle && 
           !isCycleCompleted && 
           !allStudiesCompleted;
  }, [userCycle, dailySubjectsLength, nextSubjectsLength, isCycleCompleted, allStudiesCompleted, subjects]);

  return {
    allStudiesCompleted,
    isCycleCompleted,
    allTopicsInReview,
    allDaySubjectsCompleted
  };
};
