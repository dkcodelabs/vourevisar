import { useMemo } from 'react';
import { Subject, StudyProgress, Topic } from '@/types';
import { startOfDay, format } from 'date-fns';

// Hook para cálculos memoizados de progresso
export const useMemoizedProgress = (subjects: Subject[]): StudyProgress => {
  return useMemo(() => {
    const totalSubjects = subjects.length;
    const completedSubjects = subjects.filter(s => s.status === 'Concluída').length;
    
    const allTopics = subjects.flatMap(s => s.topics);
    const totalTopics = allTopics.length;
    const completedTopics = allTopics.filter(t => t.reviewStage === 'Concluído').length;
    
    const today = startOfDay(new Date());
    const todayString = format(today, 'yyyy-MM-dd');
    
    let delayedTopics = 0;
    let todayTopics = 0;
    let futureTopics = 0;
    
    allTopics.forEach(topic => {
      if (!topic.nextReview || topic.reviewStage === 'Concluído') return;
      
      const reviewDate = format(startOfDay(new Date(topic.nextReview)), 'yyyy-MM-dd');
      
      if (reviewDate < todayString) {
        delayedTopics++;
      } else if (reviewDate === todayString) {
        todayTopics++;
      } else {
        futureTopics++;
      }
    });

    return {
      totalSubjects,
      completedSubjects,
      totalTopics,
      completedTopics,
      delayedTopics,
      todayTopics,
      futureTopics,
    };
  }, [subjects]);
};

// Hook para filtros memoizados de tópicos
export const useMemoizedTopicFilters = (topics: Topic[]) => {
  return useMemo(() => {
    const today = startOfDay(new Date());
    const todayString = format(today, 'yyyy-MM-dd');
    
    const delayed: Topic[] = [];
    const todayList: Topic[] = [];
    const future: Topic[] = [];
    const completed: Topic[] = [];
    
    topics.forEach(topic => {
      if (topic.completed || topic.reviewStage === 'Concluído') {
        completed.push(topic);
        return;
      }
      
      if (!topic.nextReview) return;
      
      const reviewDate = format(startOfDay(new Date(topic.nextReview)), 'yyyy-MM-dd');
      
      if (reviewDate < todayString) {
        delayed.push(topic);
      } else if (reviewDate === todayString) {
        todayList.push(topic);
      } else {
        future.push(topic);
      }
    });
    
    return {
      delayed,
      today: todayList,
      future,
      completed,
    };
  }, [topics]);
};

// Hook para cálculos de ciclo memoizados
export const useMemoizedCycleCalculations = (
  subjects: Subject[],
  userCycle: any,
  userSettings: { subjects_per_day: number }
) => {
  return useMemo(() => {
    if (!userCycle) {
      return {
        dailySubjects: [],
        nextSubjects: [],
        nextCycleSubjects: [],
        allDaySubjectsCompleted: false,
        hasAvailableSubjects: subjects.length > 0,
      };
    }

    const dailySubjectIds = userCycle.disciplinas_do_dia || [];
    const completedSubjectIds = userCycle.ciclo_atual || [];
    
    const dailySubjects = subjects.filter(s => dailySubjectIds.includes(s.id));
    const allDaySubjectsCompleted = dailySubjectIds.length > 0 && 
      dailySubjectIds.every(id => completedSubjectIds.includes(id));
    
    // Próximas matérias do ciclo
    const remainingSubjects = subjects.filter(s => 
      !completedSubjectIds.includes(s.id) && !dailySubjectIds.includes(s.id)
    );
    
    const nextSubjects = remainingSubjects.slice(0, userSettings.subjects_per_day);
    const nextCycleSubjects = remainingSubjects.slice(userSettings.subjects_per_day);
    
    return {
      dailySubjects,
      nextSubjects,
      nextCycleSubjects,
      allDaySubjectsCompleted,
      hasAvailableSubjects: subjects.length > 0,
    };
  }, [subjects, userCycle, userSettings]);
};

// Hook para estatísticas de dashboard memoizadas
export const useMemoizedDashboardStats = (subjects: Subject[]) => {
  return useMemo(() => {
    const today = startOfDay(new Date());
    
    let overdueCount = 0;
    let todayCount = 0;
    let totalTopics = 0;
    let completedTopics = 0;
    
    subjects.forEach(subject => {
      subject.topics.forEach(topic => {
        totalTopics++;
        
        if (topic.reviewStage === 'Concluído') {
          completedTopics++;
          return;
        }
        
        if (topic.nextReview) {
          const reviewDate = startOfDay(new Date(topic.nextReview));
          if (reviewDate < today) {
            overdueCount++;
          } else if (reviewDate.getTime() === today.getTime()) {
            todayCount++;
          }
        }
      });
    });
    
    const progressPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
    
    return {
      overdueCount,
      todayCount,
      totalTopics,
      completedTopics,
      progressPercentage,
    };
  }, [subjects]);
};