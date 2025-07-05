import { useMemo } from 'react';
import { Subject, UserCycle } from '@/types';

export const useDailySubjects = (subjects: Subject[], userCycle: UserCycle | null) => {
  const dailySubjects = useMemo(() => {
    if (!userCycle?.disciplinas_do_dia || userCycle.disciplinas_do_dia.length === 0) return [];
    
    console.log('📋 useDailySubjects - Filtrando matérias do dia:', {
      disciplinas_do_dia: userCycle.disciplinas_do_dia,
      subjects_count: subjects.length
    });
    
    const filtered = subjects.filter(subject => {
      const isInDailyList = userCycle.disciplinas_do_dia.includes(subject.id);
      const isNotCompleted = subject.status !== 'Concluída';
      const hasTopics = subject.topics && subject.topics.length > 0;
      // Todos os tópicos já estão em revisão?
      const allTopicsInReview = subject.topics && subject.topics.length > 0
        ? subject.topics.every(t => (t.reviewCount || t.review_count) > 0)
        : false;

      // Só aparece no dia se NÃO estiver tudo em revisão
      const isValid = isInDailyList && isNotCompleted && hasTopics && !allTopicsInReview;

      console.log(`📋 Matéria "${subject.name}":`, {
        isInDailyList,
        isNotCompleted,
        isValid,
        status: subject.status,
        topicsCount: subject.topics?.length || 0
      });
      
      return isValid;
    }).sort((a, b) => {
      const indexA = userCycle.disciplinas_do_dia.indexOf(a.id);
      const indexB = userCycle.disciplinas_do_dia.indexOf(b.id);
      return indexA - indexB;
    });

    console.log('📋 useDailySubjects - Resultado final:', {
      filtered_count: filtered.length,
      filtered_names: filtered.map(s => s.name)
    });

    return filtered;
  }, [subjects, userCycle?.disciplinas_do_dia]);

  return { dailySubjects };
};
