
import { useMemo } from 'react';
import { Subject, UserCycle } from '@/types';

export const useDailySubjects = (subjects: Subject[], userCycle: UserCycle | null) => {
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

  return { dailySubjects };
};
