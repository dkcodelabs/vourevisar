
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
    
    console.log('🔍 Verificando se ciclo está completo - análise detalhada:', {
      ciclo_atual: userCycle.ciclo_atual,
      disciplinas_do_dia: userCycle.disciplinas_do_dia,
      dailySubjectsLength: dailySubjects.length,
      nextSubjectsLength: nextSubjects.length
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
    const hasNoCurrentSubjects = dailySubjects.length === 0 && nextSubjects.length === 0;
    const hasSubjectsForNewCycle = availableSubjectsWithUnreviewedTopics.length > 0;
    
    const cycleCompleted = hasNoCurrentSubjects && hasSubjectsForNewCycle;
    
    console.log('🔍 Resultado da verificação de ciclo completo:', {
      hasNoCurrentSubjects,
      hasSubjectsForNewCycle,
      cycleCompleted
    });
    
    return cycleCompleted;
  }, [userCycle, dailySubjects.length, nextSubjects.length, subjects]);

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
      dailySubjectsLength: dailySubjects.length,
      nextSubjectsLength: nextSubjects.length,
      isCycleCompleted,
      result: allUnfinishedTopicsInReview && hasTopicsInReview && dailySubjects.length === 0 && nextSubjects.length === 0 && !isCycleCompleted
    });
    
    // CORRIGIDO: Só mostrar "allTopicsInReview" se NÃO estivermos em um ciclo completo
    return allUnfinishedTopicsInReview && 
           hasTopicsInReview && 
           dailySubjects.length === 0 && 
           nextSubjects.length === 0 &&
           !isCycleCompleted;
  }, [subjects, dailySubjects.length, nextSubjects.length, isCycleCompleted]);

  // CORRIGIDO: Detectar quando o dia foi concluído mas ainda há matérias no ciclo
  const allDaySubjectsCompleted = useMemo(() => {
    if (!userCycle) return false;
    
    // NOVA LÓGICA: Dia concluído quando:
    // 1. Havia matérias nas disciplinas_do_dia mas agora não há mais (foram estudadas)
    // 2. Ainda há matérias no ciclo atual disponíveis
    // 3. Não é um ciclo completo
    // 4. Não são todos os estudos completos
    
    const hadDailySubjectsOriginal = userCycle.disciplinas_do_dia.length > 0;
    const noDailySubjectsNow = dailySubjects.length === 0;
    const hasNextSubjects = nextSubjects.length > 0;
    
    console.log('🔍 Verificando allDaySubjectsCompleted:', {
      hadDailySubjectsOriginal,
      noDailySubjectsNow,
      hasNextSubjects,
      isCycleCompleted,
      allStudiesCompleted,
      userCycle_disciplinas_do_dia: userCycle.disciplinas_do_dia,
      dailySubjects_atual: dailySubjects.map(s => s.name),
      nextSubjects_atual: nextSubjects.map(s => s.name),
      result: hadDailySubjectsOriginal && noDailySubjectsNow && hasNextSubjects && !isCycleCompleted && !allStudiesCompleted
    });
    
    return hadDailySubjectsOriginal && 
           noDailySubjectsNow && 
           hasNextSubjects && 
           !isCycleCompleted && 
           !allStudiesCompleted;
  }, [userCycle, dailySubjects.length, nextSubjects.length, isCycleCompleted, allStudiesCompleted]);

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
