import { useMemo } from 'react';
import { Subject } from '@/types';

// Hook para memoizar verificações pesadas e evitar re-execuções desnecessárias
export const useOptimizedChecks = (subjects: Subject[]) => {
  // Memoizar verificação de todos os estudos concluídos
  const allStudiesCompleted = useMemo(() => {
    console.log('🔍 checkAllStudiesCompleted chamado com:', {
      subjectsCount: subjects.length,
      subjects: subjects.map(s => ({ 
        id: s.id, 
        name: s.name, 
        status: s.status 
      }))
    });

    if (subjects.length === 0) {
      console.log('🔍 Nenhuma matéria encontrada');
      return false;
    }

    let completedSubjects = 0;

    for (const subject of subjects) {
      let isCompleted = false;

      // Verificar se a matéria está marcada como concluída
      const hasStatusCompleted = subject.status === 'Concluída';
      
      if (hasStatusCompleted) {
        isCompleted = true;
        completedSubjects++;
      } else if (subject.topics && subject.topics.length > 0) {
        // Verificar se todos os tópicos estão dominados
        let dominatedTopics = 0;
        
        for (const topic of subject.topics) {
          const isDominated = (topic.reviewCount || topic.review_count) >= 5;
          console.log(`🔍 Tópico "${topic.name}": reviewStage=${topic.reviewStage}, reviewCount=${topic.reviewCount || topic.review_count}, isDominated=${isDominated}`);
          
          if (isDominated) {
            dominatedTopics++;
          }
        }
        
        const allTopicsDominated = dominatedTopics === subject.topics.length;
        
        console.log(`📋 Matéria "${subject.name}":`, {
          status: subject.status,
          hasStatusCompleted,
          topicsCount: subject.topics.length,
          dominatedTopics,
          allTopicsDominated,
          isCompleted: allTopicsDominated
        });
        
        if (allTopicsDominated) {
          isCompleted = true;
          completedSubjects++;
        }
      }
    }

    const result = completedSubjects === subjects.length && subjects.length > 0;
    
    console.log('🔍 Resultado final da verificação:', {
      totalSubjects: subjects.length,
      allSubjectsCompleted: result,
      completedSubjects
    });

    return result;
  }, [subjects]);

  // Memoizar verificação de todos os tópicos em revisão
  const allTopicsInReview = useMemo(() => {
    console.log('🔍 Verificando allTopicsInReview - análise completa:', {
      totalSubjects: subjects.length
    });
    
    if (subjects.length === 0) return false;

    // Filtrar matérias que têm tópicos e não estão concluídas
    const subjectsWithTopics = subjects.filter(s => 
      s.status !== 'Concluída' && 
      s.topics && 
      s.topics.length > 0
    );

    console.log('🔍 Matérias COM tópicos (não concluídas):', {
      count: subjectsWithTopics.length,
      subjects: subjectsWithTopics.map(s => s.name)
    });

    if (subjectsWithTopics.length === 0) return false;

    // Verificar se há matérias com tópicos não revisados
    const subjectsWithUnreviewedTopics = subjectsWithTopics.filter(subject => 
      subject.topics!.some(topic => (topic.reviewCount || topic.review_count) === 0)
    );

    console.log('🔍 Matérias com tópicos NÃO REVISADOS:', {
      count: subjectsWithUnreviewedTopics.length,
      subjects: subjectsWithUnreviewedTopics.map(s => s.name)
    });

    const hasTopicsInReview = subjectsWithTopics.length > 0 && subjectsWithUnreviewedTopics.length === 0;
    const allTopicsStartedReview = subjectsWithTopics.length > 0 && subjectsWithUnreviewedTopics.length === 0;

    console.log('🔍 Estado final allTopicsInReview:', {
      allTopicsStartedReview,
      hasTopicsInReview,
      subjectsWithTopicsCount: subjectsWithTopics.length,
      subjectsWithoutTopicsCount: subjects.length - subjectsWithTopics.length,
      result: hasTopicsInReview
    });

    return hasTopicsInReview;
  }, [subjects]);

  return {
    allStudiesCompleted,
    allTopicsInReview
  };
};