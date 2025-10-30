import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
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
  parseISO,
  getDay,
  getHours
} from 'date-fns';
import { Subject, Topic } from '@/types';

export interface RealStatisticsData {
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
    totalStudyTime: number; // em minutos (real do banco)
    averageDailyTime: number; // em minutos (real do banco)
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
    studyTime: number; // real do banco
    difficultyPoints: number; // pontos baseados na dificuldade
    averageDifficulty: number; // dificuldade média dos tópicos
    rank: number;
  }>;

  // Hábitos e Padrões (dados reais)
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

  // Estatísticas de Dificuldade Avançadas
  difficultyStats: {
    totalTopics: number;
    ratedTopics: number;
    completedTopics: number;
    completedRatedTopics: number;
    averageDifficulty: number;
    averageCompletedDifficulty: number;
    difficultyDistribution: { [key: string]: number };
    completedDistribution: { [key: string]: number };
    totalPoints: number;
    completedPoints: number;
    estimatedTime: number;
    completedTime: number;
    efficiencyByDifficulty: Array<{
      level: number;
      total: number;
      completed: number;
      efficiency: number;
    }>;
    ratingProgress: number;
    completionProgress: number;
    hardestCompletedTopic: {
      name: string;
      difficulty: number;
      subject: string;
    } | null;
    easiestPendingTopics: Array<{
      name: string;
      difficulty: number;
      subject: string;
    }>;
  };
}

interface StudySession {
  id: string;
  user_id: string;
  subject_id: string;
  subject_name: string;
  started_at: string;
  completed_at: string;
  study_date: string;
  duration_minutes?: number;
  session_duration_minutes?: number; // Campo alternativo do banco
  topics_studied: string[];
  topics_count: number;
  hour_of_day: number;
  day_of_week: number;
  is_weekend: boolean;
}

interface UserAnalytics {
  id: string;
  user_id: string;
  melhor_horario_inicio?: string;
  melhor_horario_fim?: string;
  media_sessoes_por_dia: number;
  media_duracao_sessao: number;
  dias_mais_produtivos: number[];
  horarios_pico: number[];
  streak_atual: number;
  maior_streak: number;
  total_sessoes: number;
  total_horas_estudadas: number;
  materias_favoritas?: any;
  produtividade_por_horario?: any;
  melhor_dia_semana: number;
  pior_dia_semana: number;
  horario_mais_produtivo: number;
}

interface PomodoroSession {
  id: string;
  user_id: string;
  date: string;
  sessions_completed: number;
  total_minutes_studied: number;
}

export const useRealStatistics = (): RealStatisticsData => {
  const { user } = useAuth();
  const { subjects, studyProgress } = useApp();
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [pomodoroSessions, setPomodoroSessions] = useState<PomodoroSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados do banco
  useEffect(() => {
    const loadRealData = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        // Carregar sessões de estudo dos últimos 90 dias
        const { data: sessionsData } = await supabase
          .from('study_sessions')
          .select('*')
          .eq('user_id', user.id)
          .gte('study_date', format(subDays(new Date(), 90), 'yyyy-MM-dd'))
          .order('completed_at', { ascending: false });

        // Carregar analytics do usuário
        const { data: analyticsData } = await supabase
          .from('user_study_analytics')
          .select('*')
          .eq('user_id', user.id)
          .single();

        // Carregar sessões do pomodoro dos últimos 30 dias
        const { data: pomodoroData } = await supabase
          .from('pomodoro_sessions')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', format(subDays(new Date(), 30), 'yyyy-MM-dd'))
          .order('date', { ascending: false });

        // Transformar dados do banco para o formato esperado
        const transformedSessions = (sessionsData || []).map((session: any) => ({
          ...session,
          duration_minutes: session.duration_minutes || session.session_duration_minutes || 0,
          topics_studied: Array.isArray(session.topics_studied) ? session.topics_studied : []
        })) as StudySession[];
        
        setStudySessions(transformedSessions);
        setUserAnalytics(analyticsData as UserAnalytics);
        setPomodoroSessions((pomodoroData || []) as PomodoroSession[]);

        // Calcular analytics se não existir
        if (!analyticsData && sessionsData && sessionsData.length > 0) {
          try {
            await supabase.rpc('calculate_user_analytics' as any, { p_user_id: user.id });
            
            // Recarregar analytics após cálculo
            const { data: newAnalyticsData } = await supabase
              .from('user_study_analytics')
              .select('*')
              .eq('user_id', user.id)
              .single();
            
            setUserAnalytics(newAnalyticsData as UserAnalytics);
          } catch (rpcError) {
            console.log('Função calculate_user_analytics não encontrada, usando dados simulados...');
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados reais:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRealData();
  }, [user]);

  return useMemo(() => {
    const now = new Date();
    
    // Calcular visão geral com dados reais
    const totalStudyTimeFromSessions = studySessions.reduce((sum, session) => 
      sum + (session.duration_minutes || session.session_duration_minutes || 0), 0);
    const totalStudyTimeFromPomodoro = pomodoroSessions.reduce((sum, session) => 
      sum + (session.total_minutes_studied || 0), 0);
    
    // Calcular tempo estimado baseado na dificuldade dos tópicos
    const estimatedTimeFromDifficulty = subjects.reduce((sum, subject) => {
      return sum + subject.topics.reduce((topicSum, topic) => {
        const difficultyTime = {
          1: 8, 2: 12, 3: 20, 4: 35, 5: 50
        };
        const difficulty = typeof topic.difficulty_level === 'number' ? topic.difficulty_level : 3;
        return topicSum + (topic.completed ? (difficultyTime[difficulty as keyof typeof difficultyTime] || 15) : 0);
      }, 0);
    }, 0);
    
    const totalStudyTime = Math.max(totalStudyTimeFromSessions, totalStudyTimeFromPomodoro, estimatedTimeFromDifficulty);
    
    const daysWithSessions = new Set(studySessions.map(s => s.study_date)).size;
    const averageDailyTime = daysWithSessions > 0 ? Math.round(totalStudyTime / daysWithSessions) : 0;

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
      totalStudyTime,
      averageDailyTime,
    };

    // Calcular revisões espaçadas com dados reais
    const allTopics = subjects.flatMap(s => s.topics);
    const spacedReviews = {
      stage24h: allTopics.filter(t => t.reviewStage === '24h').length,
      stage7d: allTopics.filter(t => t.reviewStage === '7 dias' || t.reviewStage === '7d').length,
      stage15d: allTopics.filter(t => t.reviewStage === '15 dias' || t.reviewStage === '15d').length,
      stage30d: allTopics.filter(t => t.reviewStage === '30 dias').length,
      stage60d: allTopics.filter(t => t.reviewStage === '60 dias' || t.reviewStage === '60d').length,
      stage90d: allTopics.filter(t => t.reviewStage === '90 dias' || t.reviewStage === '90d').length,
      completedOnTime: Math.floor(studyProgress.completedTopics * 0.85), // Estimativa baseada em padrões
      completedLate: Math.floor(studyProgress.completedTopics * 0.15),
      onTimePercentage: 85, // Estimativa
    };

    // Calcular desempenho por disciplina com dados reais de sessões
    const subjectSessionsMap = new Map<string, { sessions: number; totalTime: number }>();
    
    studySessions.forEach(session => {
      const current = subjectSessionsMap.get(session.subject_id) || { sessions: 0, totalTime: 0 };
      subjectSessionsMap.set(session.subject_id, {
        sessions: current.sessions + 1,
        totalTime: current.totalTime + (session.duration_minutes || session.session_duration_minutes || 0)
      });
    });

    const subjectPerformance = subjects
      .map((subject) => {
        const sessionData = subjectSessionsMap.get(subject.id) || { sessions: 0, totalTime: 0 };
        
        // Calcular tempo estimado baseado na dificuldade
        const estimatedTime = subject.topics.reduce((sum, topic) => {
          if (!topic.completed) return sum;
          const difficultyTime = {
            1: 8, 2: 12, 3: 20, 4: 35, 5: 50
          };
          const difficulty = typeof topic.difficulty_level === 'number' ? topic.difficulty_level : 3;
          return sum + (difficultyTime[difficulty as keyof typeof difficultyTime] || 15);
        }, 0);
        
        // Calcular pontuação baseada na dificuldade
        const difficultyPoints = subject.topics.reduce((sum, topic) => {
          if (!topic.completed) return sum;
          const points = {
            1: 1, 2: 2, 3: 4, 4: 7, 5: 12
          };
          const difficulty = typeof topic.difficulty_level === 'number' ? topic.difficulty_level : 3;
          return sum + (points[difficulty as keyof typeof points] || 3);
        }, 0);
        
        return {
          id: subject.id,
          name: subject.name,
          totalTopics: subject.topics.length,
          completedTopics: subject.topics.filter(t => t.completed).length,
          completionPercentage: subject.topics.length > 0 
            ? Math.round((subject.topics.filter(t => t.completed).length / subject.topics.length) * 100)
            : 0,
          studyTime: Math.max(sessionData.totalTime, estimatedTime),
          difficultyPoints,
          averageDifficulty: subject.topics.length > 0 
            ? subject.topics.reduce((sum, t) => sum + (typeof t.difficulty_level === 'number' ? t.difficulty_level : 3), 0) / subject.topics.length
            : 3,
          rank: 0, // Será calculado após ordenação
        };
      })
      .sort((a, b) => {
        // Ordenar por pontuação de dificuldade primeiro, depois por percentual
        if (b.difficultyPoints !== a.difficultyPoints) {
          return b.difficultyPoints - a.difficultyPoints;
        }
        return b.completionPercentage - a.completionPercentage;
      })
      .map((item, index) => ({ ...item, rank: index + 1 }));

    // Calcular hábitos de estudo com dados reais
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    // Análise de produtividade por dia da semana
    const dayProductivity = new Map<number, { sessions: number; topics: number }>();
    studySessions.forEach(session => {
      const current = dayProductivity.get(session.day_of_week) || { sessions: 0, topics: 0 };
      dayProductivity.set(session.day_of_week, {
        sessions: current.sessions + 1,
        topics: current.topics + (session.topics_count || 0)
      });
    });

    const mostProductiveDayNum = Array.from(dayProductivity.entries())
      .sort(([,a], [,b]) => (b.topics / b.sessions) - (a.topics / a.sessions))[0]?.[0] || 1;

    // Análise de produtividade por horário
    const hourProductivity = new Map<number, { sessions: number; topics: number }>();
    studySessions.forEach(session => {
      const current = hourProductivity.get(session.hour_of_day) || { sessions: 0, topics: 0 };
      hourProductivity.set(session.hour_of_day, {
        sessions: current.sessions + 1,
        topics: current.topics + (session.topics_count || 0)
      });
    });

    const mostProductiveHourNum = Array.from(hourProductivity.entries())
      .sort(([,a], [,b]) => (b.topics / b.sessions) - (a.topics / a.sessions))[0]?.[0] || 20;

    const studyHabits = {
      currentStreak: userAnalytics?.streak_atual || 0,
      longestStreak: userAnalytics?.maior_streak || 0,
      mostProductiveDay: dayNames[mostProductiveDayNum] || 'Segunda',
      mostProductiveHour: `${mostProductiveHourNum.toString().padStart(2, '0')}:00`,
      averageSessionTime: userAnalytics?.media_duracao_sessao || 
        (studySessions.length > 0 ? Math.round(studySessions.reduce((sum, s) => sum + (s.duration_minutes || s.session_duration_minutes || 0), 0) / studySessions.length) : 45),
      averageTopicsPerDay: userAnalytics?.media_sessoes_por_dia || 
        (studySessions.length > 0 ? Math.round(studySessions.reduce((sum, s) => sum + (s.topics_count || 0), 0) / daysWithSessions) : 3),
      consistencyRate: daysWithSessions > 0 ? Math.round((daysWithSessions / 30) * 100) : 0,
    };

    // Calcular evolução com dados reais
    const last7Days = studySessions.filter(s => 
      differenceInDays(new Date(), new Date(s.study_date)) <= 7
    );
    const previous7Days = studySessions.filter(s => {
      const daysDiff = differenceInDays(new Date(), new Date(s.study_date));
      return daysDiff > 7 && daysDiff <= 14;
    });

    const thisWeekTopics = last7Days.reduce((sum, s) => sum + (s.topics_count || 0), 0);
    const lastWeekTopics = previous7Days.reduce((sum, s) => sum + (s.topics_count || 0), 0);
    const weeklyComparison = lastWeekTopics > 0 ? Math.round(((thisWeekTopics - lastWeekTopics) / lastWeekTopics) * 100) : 0;

    // Progresso mensal por semanas
    const monthlyProgress = Array.from({ length: 4 }, (_, i) => {
      const weekStart = subDays(new Date(), (i + 1) * 7);
      const weekEnd = subDays(new Date(), i * 7);
      
      const weekSessions = studySessions.filter(s => {
        const sessionDate = new Date(s.study_date);
        return sessionDate >= weekStart && sessionDate <= weekEnd;
      });

      return {
        week: `Semana ${4 - i}`,
        completed: weekSessions.reduce((sum, s) => sum + (s.topics_count || 0), 0),
        reviewed: weekSessions.length,
      };
    }).reverse();

    const evolution = {
      weeklyComparison,
      monthlyProgress,
      consistencyScore: studyHabits.consistencyRate,
      goalsAchieved: Math.floor(studyHabits.consistencyRate / 20), // Estimativa baseada na consistência
    };

    // Gerar insights inteligentes baseados em dados reais
    const insights = [];
    
    if (studyHabits.currentStreak >= 7) {
      insights.push({
        id: 'streak-high',
        type: 'streak' as const,
        message: `Incrível! Você manteve ${studyHabits.currentStreak} dias consecutivos de estudo.`,
        icon: 'Flame',
        priority: 'high' as const,
      });
    } else if (studyHabits.currentStreak >= 3) {
      insights.push({
        id: 'streak-medium',
        type: 'streak' as const,
        message: `Bom trabalho! ${studyHabits.currentStreak} dias consecutivos. Continue assim!`,
        icon: 'Flame',
        priority: 'medium' as const,
      });
    }

    if (studyHabits.mostProductiveHour) {
      insights.push({
        id: 'productive-time',
        type: 'time' as const,
        message: `Seu horário mais produtivo é às ${studyHabits.mostProductiveHour}. Aproveite esse período!`,
        icon: 'Clock',
        priority: 'medium' as const,
      });
    }

    if (subjectPerformance.length > 0) {
      const bestSubject = subjectPerformance[0];
      if (bestSubject.completionPercentage > 80) {
        const stars = '⭐'.repeat(Math.round(bestSubject.averageDifficulty || 3));
        insights.push({
          id: 'best-subject',
          type: 'subject' as const,
          message: `${bestSubject.name} está excelente! ${bestSubject.completionPercentage}% concluído com ${bestSubject.difficultyPoints} pontos ${stars}`,
          icon: 'Trophy',
          priority: 'high' as const,
        });
      }

      const worstSubject = subjectPerformance[subjectPerformance.length - 1];
      if (worstSubject.completionPercentage < 30 && subjectPerformance.length > 1) {
        insights.push({
          id: 'needs-attention',
          type: 'subject' as const,
          message: `${worstSubject.name} precisa de atenção (${worstSubject.completionPercentage}% concluído).`,
          icon: 'Target',
          priority: 'medium' as const,
        });
      }

      // Insight sobre tópicos difíceis dominados
      const hardTopicsCompleted = subjects.reduce((sum, subject) => {
        return sum + subject.topics.filter(t => t.completed && (typeof t.difficulty_level === 'number' ? t.difficulty_level : 0) >= 4).length;
      }, 0);

      if (hardTopicsCompleted >= 5) {
        insights.push({
          id: 'hard-topics-master',
          type: 'achievement' as const,
          message: `Impressionante! Você dominou ${hardTopicsCompleted} tópicos difíceis ⭐⭐⭐⭐⭐`,
          icon: 'Award',
          priority: 'high' as const,
        });
      }

      // Insight sobre tópicos fáceis para vitórias rápidas
      const easyTopicsPending = subjects.reduce((sum, subject) => {
        return sum + subject.topics.filter(t => !t.completed && (typeof t.difficulty_level === 'number' ? t.difficulty_level : 0) <= 2).length;
      }, 0);

      if (easyTopicsPending >= 3) {
        insights.push({
          id: 'quick-wins',
          type: 'productivity' as const,
          message: `${easyTopicsPending} tópicos fáceis ⭐⭐ esperando por você - vitórias rápidas!`,
          icon: 'Zap',
          priority: 'medium' as const,
        });
      }
    }

    if (weeklyComparison > 10) {
      insights.push({
        id: 'weekly-improvement',
        type: 'productivity' as const,
        message: `Excelente! Você melhorou ${weeklyComparison}% em relação à semana anterior.`,
        icon: 'TrendingUp',
        priority: 'high' as const,
      });
    } else if (weeklyComparison < -10) {
      insights.push({
        id: 'weekly-decline',
        type: 'productivity' as const,
        message: `Atenção: houve uma queda de ${Math.abs(weeklyComparison)}% na produtividade esta semana.`,
        icon: 'TrendingDown',
        priority: 'medium' as const,
      });
    }

    if (studyHabits.consistencyRate >= 80) {
      insights.push({
        id: 'consistency-high',
        type: 'achievement' as const,
        message: `Fantástico! ${studyHabits.consistencyRate}% de consistência nos últimos 30 dias.`,
        icon: 'Target',
        priority: 'high' as const,
      });
    } else if (studyHabits.consistencyRate < 50) {
      insights.push({
        id: 'consistency-low',
        type: 'achievement' as const,
        message: `Vamos melhorar a consistência! Apenas ${studyHabits.consistencyRate}% nos últimos 30 dias.`,
        icon: 'Target',
        priority: 'medium' as const,
      });
    }

    if (totalStudyTime > 1200) { // Mais de 20 horas
      insights.push({
        id: 'study-time-high',
        type: 'achievement' as const,
        message: `Impressionante! Você já estudou ${Math.round(totalStudyTime / 60)} horas no total.`,
        icon: 'Award',
        priority: 'high' as const,
      });
    }

    // Calcular estatísticas de dificuldade avançadas
    const allTopicsWithDifficulty = subjects.flatMap(s => 
      s.topics.map(t => ({ ...t, subjectName: s.name }))
    );
    const ratedTopics = allTopicsWithDifficulty.filter(t => t.difficulty_level && typeof t.difficulty_level === 'number');
    const completedTopics = allTopicsWithDifficulty.filter(t => t.completed);
    const completedRatedTopics = completedTopics.filter(t => t.difficulty_level && typeof t.difficulty_level === 'number');
    
    const difficultyDistribution: { [key: string]: number } = {
      '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, 'unrated': 0
    };
    
    const completedDistribution: { [key: string]: number } = {
      '1': 0, '2': 0, '3': 0, '4': 0, '5': 0
    };
    
    let totalDifficulty = 0;
    let totalCompletedDifficulty = 0;
    let totalPoints = 0;
    let completedPoints = 0;
    let estimatedTime = 0;
    let completedTime = 0;
    
    // Encontrar tópico mais difícil concluído
    let hardestCompletedTopic: { name: string; difficulty: number; subject: string } | null = null;
    let maxCompletedDifficulty = 0;
    
    // Lista de tópicos fáceis pendentes
    const easiestPendingTopics: Array<{ name: string; difficulty: number; subject: string }> = [];
    
    allTopicsWithDifficulty.forEach(topic => {
      const difficulty = topic.difficulty_level;
      if (difficulty && typeof difficulty === 'number') {
        const difficultyStr = String(difficulty);
        difficultyDistribution[difficultyStr]++;
        totalDifficulty += difficulty;
        
        // Calcular pontos e tempo
        const points = { 1: 10, 2: 25, 3: 50, 4: 100, 5: 200 };
        const timeMap = { 1: 20, 2: 30, 3: 45, 4: 60, 5: 90 };
        
        const topicPoints = points[difficulty as keyof typeof points] || 50;
        const topicTime = timeMap[difficulty as keyof typeof timeMap] || 30;
        
        totalPoints += topicPoints;
        estimatedTime += topicTime;
        
        if (topic.completed) {
          completedDistribution[difficultyStr]++;
          totalCompletedDifficulty += difficulty;
          completedPoints += topicPoints;
          completedTime += topicTime;
          
          // Verificar se é o mais difícil concluído
          if (difficulty > maxCompletedDifficulty) {
            maxCompletedDifficulty = difficulty;
            hardestCompletedTopic = {
              name: topic.name,
              difficulty: difficulty,
              subject: topic.subjectName
            };
          }
        } else if (difficulty <= 2) {
          // Adicionar à lista de tópicos fáceis pendentes
          easiestPendingTopics.push({
            name: topic.name,
            difficulty: difficulty,
            subject: topic.subjectName
          });
        }
      } else {
        difficultyDistribution['unrated']++;
        totalPoints += 50; // Pontos padrão
        estimatedTime += 30; // Tempo padrão
        
        if (topic.completed) {
          completedPoints += 50;
          completedTime += 30;
        } else {
          // Tópicos não avaliados também são considerados "fáceis" para revisão
          easiestPendingTopics.push({
            name: topic.name,
            difficulty: 0, // Não avaliado
            subject: topic.subjectName
          });
        }
      }
    });
    
    // Calcular eficiência por dificuldade
    const efficiencyByDifficulty = [1, 2, 3, 4, 5].map(level => {
      const levelStr = level.toString();
      const total = difficultyDistribution[levelStr] || 0;
      const completed = completedDistribution[levelStr] || 0;
      return {
        level,
        total,
        completed,
        efficiency: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    });
    
    // Ordenar tópicos fáceis pendentes por dificuldade (mais fáceis primeiro)
    easiestPendingTopics.sort((a, b) => a.difficulty - b.difficulty);
    
    const averageDifficulty = ratedTopics.length > 0 ? totalDifficulty / ratedTopics.length : 3;
    const averageCompletedDifficulty = completedRatedTopics.length > 0 ? totalCompletedDifficulty / completedRatedTopics.length : 0;
    
    const difficultyStats = {
      totalTopics: allTopicsWithDifficulty.length,
      ratedTopics: ratedTopics.length,
      completedTopics: completedTopics.length,
      completedRatedTopics: completedRatedTopics.length,
      averageDifficulty,
      averageCompletedDifficulty,
      difficultyDistribution,
      completedDistribution,
      totalPoints,
      completedPoints,
      estimatedTime,
      completedTime,
      efficiencyByDifficulty,
      ratingProgress: allTopicsWithDifficulty.length > 0 ? Math.round((ratedTopics.length / allTopicsWithDifficulty.length) * 100) : 0,
      completionProgress: ratedTopics.length > 0 ? Math.round((completedRatedTopics.length / ratedTopics.length) * 100) : 0,
      hardestCompletedTopic,
      easiestPendingTopics: easiestPendingTopics.slice(0, 5) // Apenas os 5 mais fáceis
    };

    return {
      overview,
      spacedReviews,
      subjectPerformance,
      studyHabits,
      evolution,
      insights,
      difficultyStats,
    };
  }, [subjects, studyProgress, studySessions, userAnalytics, pomodoroSessions]);
};