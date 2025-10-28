import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { 
  isToday, 
  isBefore, 
  isAfter, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  subDays, 
  differenceInDays,
  startOfDay,
  parseISO
} from 'date-fns';
import { Subject, Topic } from '@/types';

export interface StatisticsData {
  // Visão Geral
  overview: {
    totalSubjects: number;
    completedSubjects: number;
    inProgressSubjects: number;
    notStartedSubjects: number;
    totalTopics: number;
    completedTopics: number;
    inProgressTopics: number;
    notStartedTopics: number;
    totalReviews: number;
    completedReviews: number;
    pendingReviews: number;
    delayedReviews: number;
    overallProgress: number;
    totalStudyTime: number; // em minutos (simulado)
    averageDailyTime: number; // em minutos (simulado)
  };

  // Revisões Espaçadas
  spacedReviews: {
    stage24h: number;
    stage7d: number;
    stage15d: number;
    stage30d: number;
    stage60d: number;
    stage90d: number;
    completedOnTime: number;
    completedLate: number;
    onTimePercentage: number;
  };

  // Desempenho por Disciplina
  subjectPerformance: Array<{
    id: string;
    name: string;
    totalTopics: number;
    completedTopics: number;
    completionPercentage: number;
    studyTime: number; // simulado
    rank: number;
  }>;

  // Hábitos e Padrões
  studyHabits: {
    currentStreak: number;
    longestStreak: number;
    mostProductiveDay: string;
    mostProductiveHour: string;
    averageSessionTime: number;
    averageTopicsPerDay: number;
    consistencyRate: number; // % dos últimos 30 dias
  };

  // Evolução e Consistência
  evolution: {
    weeklyComparison: number; // % de mudança
    monthlyProgress: Array<{
      week: string;
      completed: number;
      reviewed: number;
    }>;
    consistencyScore: number;
    goalsAchieved: number;
  };

  // Insights Inteligentes
  insights: Array<{
    id: string;
    type: 'streak' | 'productivity' | 'subject' | 'time' | 'achievement';
    message: string;
    icon: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export const useAdvancedStatistics = (): StatisticsData => {
  const { subjects, studyProgress } = useApp();

  return useMemo(() => {
    const now = new Date();
    
    // Calcular visão geral
    const overview = {
      totalSubjects: subjects.length,
      completedSubjects: subjects.filter(s => s.status === 'Concluída').length,
      inProgressSubjects: subjects.filter(s => s.status === 'Em Estudo').length,
      notStartedSubjects: subjects.filter(s => s.status === 'Nova').length,
      totalTopics: studyProgress.totalTopics,
      completedTopics: studyProgress.completedTopics,
      inProgressTopics: studyProgress.totalTopics - studyProgress.completedTopics - studyProgress.futureTopics,
      notStartedTopics: studyProgress.futureTopics,
      totalReviews: studyProgress.totalTopics,
      completedReviews: studyProgress.completedTopics,
      pendingReviews: studyProgress.todayTopics,
      delayedReviews: studyProgress.delayedTopics,
      overallProgress: studyProgress.totalTopics > 0 
        ? Math.round((studyProgress.completedTopics / studyProgress.totalTopics) * 100) 
        : 0,
      totalStudyTime: Math.floor(Math.random() * 1200) + 300, // Simulado: 5-25 horas
      averageDailyTime: Math.floor(Math.random() * 120) + 30, // Simulado: 30-150 min
    };

    // Calcular revisões espaçadas
    const allTopics = subjects.flatMap(s => s.topics);
    const spacedReviews = {
      stage24h: allTopics.filter(t => t.reviewStage === '24h').length,
      stage7d: allTopics.filter(t => t.reviewStage === '7 dias').length,
      stage15d: allTopics.filter(t => t.reviewStage === '15 dias' || t.reviewStage === '15d').length,
      stage30d: allTopics.filter(t => t.reviewStage === '30 dias').length,
      stage60d: allTopics.filter(t => t.reviewStage === '60 dias' || t.reviewStage === '60d').length,
      stage90d: allTopics.filter(t => t.reviewStage === '90 dias' || t.reviewStage === '90d').length,
      completedOnTime: Math.floor(studyProgress.completedTopics * 0.8), // Simulado
      completedLate: Math.floor(studyProgress.completedTopics * 0.2), // Simulado
      onTimePercentage: 80, // Simulado
    };

    // Calcular desempenho por disciplina
    const subjectPerformance = subjects
      .map((subject, index) => ({
        id: subject.id,
        name: subject.name,
        totalTopics: subject.topics.length,
        completedTopics: subject.topics.filter(t => t.completed).length,
        completionPercentage: subject.topics.length > 0 
          ? Math.round((subject.topics.filter(t => t.completed).length / subject.topics.length) * 100)
          : 0,
        studyTime: Math.floor(Math.random() * 300) + 60, // Simulado
        rank: index + 1,
      }))
      .sort((a, b) => b.completionPercentage - a.completionPercentage)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    // Calcular hábitos de estudo (simulados com base em dados reais quando possível)
    const studyHabits = {
      currentStreak: Math.floor(Math.random() * 15) + 1,
      longestStreak: Math.floor(Math.random() * 30) + 5,
      mostProductiveDay: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'][Math.floor(Math.random() * 7)],
      mostProductiveHour: ['08:00', '14:00', '20:00', '21:00', '22:00'][Math.floor(Math.random() * 5)],
      averageSessionTime: Math.floor(Math.random() * 60) + 30,
      averageTopicsPerDay: Math.floor(Math.random() * 8) + 2,
      consistencyRate: Math.floor(Math.random() * 40) + 60, // 60-100%
    };

    // Calcular evolução (simulado)
    const evolution = {
      weeklyComparison: Math.floor(Math.random() * 30) - 10, // -10% a +20%
      monthlyProgress: Array.from({ length: 4 }, (_, i) => ({
        week: `Semana ${i + 1}`,
        completed: Math.floor(Math.random() * 20) + 5,
        reviewed: Math.floor(Math.random() * 15) + 3,
      })),
      consistencyScore: studyHabits.consistencyRate,
      goalsAchieved: Math.floor(Math.random() * 5) + 2,
    };

    // Gerar insights inteligentes
    const insights = [];
    
    if (studyHabits.currentStreak >= 7) {
      insights.push({
        id: 'streak-high',
        type: 'streak' as const,
        message: `Parabéns! Você manteve ${studyHabits.currentStreak} dias consecutivos de estudo.`,
        icon: 'Flame',
        priority: 'high' as const,
      });
    }

    if (studyHabits.mostProductiveHour) {
      insights.push({
        id: 'productive-time',
        type: 'time' as const,
        message: `Seu melhor horário de estudo é às ${studyHabits.mostProductiveHour}.`,
        icon: 'Clock',
        priority: 'medium' as const,
      });
    }

    if (subjectPerformance.length > 0) {
      const bestSubject = subjectPerformance[0];
      if (bestSubject.completionPercentage > 80) {
        insights.push({
          id: 'best-subject',
          type: 'subject' as const,
          message: `${bestSubject.name} está com excelente progresso (${bestSubject.completionPercentage}%).`,
          icon: 'Trophy',
          priority: 'high' as const,
        });
      }
    }

    if (evolution.weeklyComparison > 0) {
      insights.push({
        id: 'weekly-improvement',
        type: 'productivity' as const,
        message: `Você melhorou ${evolution.weeklyComparison}% em relação à semana anterior.`,
        icon: 'TrendingUp',
        priority: 'medium' as const,
      });
    }

    if (studyHabits.consistencyRate >= 80) {
      insights.push({
        id: 'consistency',
        type: 'achievement' as const,
        message: `Excelente consistência! ${studyHabits.consistencyRate}% de frequência nos últimos 30 dias.`,
        icon: 'Target',
        priority: 'high' as const,
      });
    }

    return {
      overview,
      spacedReviews,
      subjectPerformance,
      studyHabits,
      evolution,
      insights,
    };
  }, [subjects, studyProgress]);
};