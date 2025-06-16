
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

    // Verificar se existem matérias disponíveis com tópicos não revisados (GLOBALMENTE)
    const availableSubjectsWithUnreviewedTopics = subjects.filter(subject => {
      if (subject.status === 'Concluída') return false;
      if (!subject.topics || subject.topics.length === 0) return false;
      return subject.topics.some(topic => topic.review_count === 0);
    });

    console.log('🔍 Matérias disponíveis com tópicos não revisados:', {
      count: availableSubjectsWithUnreviewedTopics.length,
      subjects: availableSubjectsWithUnreviewedTopics.map(s => s.name)
    });

    // CORRIGIDO: Ciclo está completo apenas se NÃO há matérias disponíveis para estudar
    const hasNoCurrentSubjects = dailySubjectsLength === 0 && nextSubjectsLength === 0;
    const hasNoSubjectsToStudy = availableSubjectsWithUnreviewedTopics.length === 0;
    
    const cycleCompleted = hasNoCurrentSubjects && hasNoSubjectsToStudy;
    
    console.log('🔍 Resultado da verificação de ciclo completo:', {
      hasNoCurrentSubjects,
      hasNoSubjectsToStudy,
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

  // CORRIGIDO: Detectar quando o dia foi concluído mas ainda há matérias disponíveis
  const allDaySubjectsCompleted = useMemo(() => {
    if (!userCycle) return false;
    
    // CORRIGIDO: Mostrar botão "Próximo Dia" quando:
    // 1. Não há matérias para estudar hoje E
    // 2. Há próximas matérias disponíveis E
    // 3. Não são todos os estudos completos
    
    const noDailySubjectsNow = dailySubjectsLength === 0;
    const hasNextSubjects = nextSubjectsLength > 0;
    
    console.log('🔍 Verificando allDaySubjectsCompleted - LÓGICA CORRIGIDA:', {
      noDailySubjectsNow,
      hasNextSubjects,
      allStudiesCompleted,
      isCycleCompleted,
      result: noDailySubjectsNow && hasNextSubjects && !allStudiesCompleted && !isCycleCompleted
    });
    
    return noDailySubjectsNow && 
           hasNextSubjects && 
           !allStudiesCompleted &&
           !isCycleCompleted;
  }, [userCycle, dailySubjectsLength, nextSubjectsLength, allStudiesCompleted, isCycleCompleted]);

  return {
    allStudiesCompleted,
    isCycleCompleted,
    allTopicsInReview,
    allDaySubjectsCompleted
  };
};
