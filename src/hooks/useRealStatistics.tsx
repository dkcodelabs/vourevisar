import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useCycleState } from '@/hooks/useCycleState';
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
import { isVisibleCycleTopic, getVisibleCycleTopics } from '@/utils/studyCycleTopicVisibility';
import { getStatisticsStudyTime } from '@/utils/statisticsStudyTime';

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
    mostProductiveHour: string | null;
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
  materias_favoritas?: unknown;
  produtividade_por_horario?: unknown;
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

type ReviewHistoryStudyRow = {
  topic_id: string | null;
  reviewed_at: string | null;
  study_duration_minutes: number | null;
  topics: { subject_id: string | null } | null;
};

type DifficultyTopicInsight = {
  name: string;
  difficulty: number;
  subject: string;
};

export interface StatisticsFilter {
  type: 'all' | 'cycle' | 'edital';
  id?: string;
}

export const useRealStatistics = (filter: StatisticsFilter = { type: 'cycle' }): RealStatisticsData => {
  const { user } = useAuth();
  const { subjects, studyProgress } = useApp();
  const { userCycle } = useCycleState();
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [pomodoroSessions, setPomodoroSessions] = useState<PomodoroSession[]>([]);
  const [reviewHistoryStudyMinutes, setReviewHistoryStudyMinutes] = useState(0);
  const [reviewHistoryStudyDates, setReviewHistoryStudyDates] = useState<string[]>([]);
  const [reviewHistoryStudyMinutesBySubject, setReviewHistoryStudyMinutesBySubject] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Listener para eventos de atualização
  useEffect(() => {
    const handleRefresh = () => {
      console.log('[useRealStatistics] Evento de atualização recebido, recarregando dados...');
      setRefreshCounter(prev => prev + 1);
    };

    window.addEventListener('cycleUpdated', handleRefresh);
    window.addEventListener('mergeUpdated', handleRefresh);
    window.addEventListener('subjectUpdated', handleRefresh);
    window.addEventListener('topicUpdated', handleRefresh);

    return () => {
      window.removeEventListener('cycleUpdated', handleRefresh);
      window.removeEventListener('mergeUpdated', handleRefresh);
      window.removeEventListener('subjectUpdated', handleRefresh);
      window.removeEventListener('topicUpdated', handleRefresh);
    };
  }, []);

  // Carregar dados do banco
  useEffect(() => {
    const loadRealData = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        const activeCycleSubjectIds =
          filter.type === 'cycle' && Array.isArray(userCycle?.ciclo_atual) ? (userCycle.ciclo_atual as string[]) : [];
        let activeCycleTopicIds: string[] = [];

        // Determinar ID do ciclo para filtragem
        const effectiveCycleId = filter.type === 'cycle' 
          ? (filter.id || userCycle?.id) 
          : null;

        if (filter.type === 'cycle' && activeCycleSubjectIds.length > 0) {
          const { data: topicScopeData, error: topicScopeError } = await supabase
            .from('topics')
            .select('id, is_active, is_hidden')
            .in('subject_id', activeCycleSubjectIds);

          if (topicScopeError) throw topicScopeError;

          activeCycleTopicIds = (topicScopeData || [])
            .filter(isVisibleCycleTopic)
            .map(topic => topic.id);
        }

        // Construir queries
        let sessionsQuery = supabase
          .from('study_sessions')
          .select('*')
          .eq('user_id', user.id);

        if (filter.type === 'cycle' && effectiveCycleId) {
          sessionsQuery = sessionsQuery.eq('cycle_id', effectiveCycleId);
          if (activeCycleSubjectIds.length > 0) {
            sessionsQuery = sessionsQuery.in('subject_id', activeCycleSubjectIds);
          }
        } else if (filter.type === 'edital' && filter.id) {
          sessionsQuery = sessionsQuery.eq('edital_id', filter.id);
        } else {
          // No modo "Tudo", limitamos aos últimos 90 dias para performance
          sessionsQuery = sessionsQuery.gte('study_date', format(subDays(new Date(), 90), 'yyyy-MM-dd'));
        }

        const { data: sessionsData } = await sessionsQuery.order('completed_at', { ascending: false });

        let scopedReviewHistoryMinutes = 0;
        const scopedReviewHistoryDates = new Set<string>();
        const scopedReviewHistoryMinutesBySubject = new Map<string, number>();

        if (filter.type === 'cycle' && activeCycleTopicIds.length > 0) {
          let reviewHistoryQuery = supabase
            .from('topic_review_history')
            .select(`
              topic_id,
              reviewed_at,
              study_duration_minutes,
              topics!inner(subject_id)
            `)
            .eq('user_id', user.id)
            .in('topic_id', activeCycleTopicIds);

          if (userCycle?.data_inicio_ciclo) {
            reviewHistoryQuery = reviewHistoryQuery.gte('reviewed_at', userCycle.data_inicio_ciclo);
          }

          const { data: reviewHistoryData, error: reviewHistoryError } = await reviewHistoryQuery;
          if (reviewHistoryError) throw reviewHistoryError;

          (reviewHistoryData as ReviewHistoryStudyRow[] | null || []).forEach((row) => {
            const duration = Math.max(0, Number(row.study_duration_minutes || 0));
            if (duration <= 0) return;

            scopedReviewHistoryMinutes += duration;

            if (row.reviewed_at) {
              scopedReviewHistoryDates.add(format(startOfDay(new Date(row.reviewed_at)), 'yyyy-MM-dd'));
            }

            const subjectId = row.topics?.subject_id;
            if (subjectId) {
              scopedReviewHistoryMinutesBySubject.set(
                subjectId,
                (scopedReviewHistoryMinutesBySubject.get(subjectId) || 0) + duration,
              );
            }
          });
        }

        // Carregar analytics do usuário (Geral)
        const { data: analyticsData } = await supabase
          .from('user_study_analytics')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        // Carregar sessões do pomodoro
        const pomodoroData =
          filter.type === 'all'
            ? (
                await supabase
                  .from('pomodoro_sessions')
                  .select('*')
                  .eq('user_id', user.id)
                  .gte('date', format(subDays(new Date(), 30), 'yyyy-MM-dd'))
                  .order('date', { ascending: false })
              ).data
            : [];

        // Transformar dados do banco para o formato esperado
        const transformedSessions = (sessionsData as StudySession[] | null || []).map((session) => ({
          ...session,
          duration_minutes: session.duration_minutes || session.session_duration_minutes || 0,
          topics_studied: Array.isArray(session.topics_studied) ? session.topics_studied : []
        })) as StudySession[];
        
        setStudySessions(transformedSessions);
        setUserAnalytics(analyticsData as UserAnalytics);
        setPomodoroSessions((pomodoroData || []) as PomodoroSession[]);
        setReviewHistoryStudyMinutes(scopedReviewHistoryMinutes);
        setReviewHistoryStudyDates(Array.from(scopedReviewHistoryDates));
        setReviewHistoryStudyMinutesBySubject(scopedReviewHistoryMinutesBySubject);

        // Calcular analytics se não existir
        if (!analyticsData && sessionsData && sessionsData.length > 0) {
          try {
            await supabase.rpc('calculate_user_analytics', { p_user_id: user.id });
            
            // Recarregar analytics após cálculo
            const { data: newAnalyticsData } = await supabase
              .from('user_study_analytics')
              .select('*')
              .eq('user_id', user.id)
              .maybeSingle();
            
            setUserAnalytics(newAnalyticsData as UserAnalytics);
          } catch (rpcError) {
            console.log('Erro ao calcular analytics:', rpcError);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados reais:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRealData();
  }, [user, filter.id, filter.type, userCycle?.id, userCycle?.ciclo_atual, userCycle?.data_inicio_ciclo, refreshCounter]);

  return useMemo(() => {
    const now = new Date();
    
    // 0. Filtrar matérias baseado no escopo (Ciclo Atual vs Histórico Total)
    const filteredSubjects = (() => {
      if (filter.type === 'cycle' && userCycle?.ciclo_atual) {
        const cycleIds = new Set(userCycle.ciclo_atual);
        return subjects
          .filter(s => cycleIds.has(s.id))
          .map(subject => ({
            ...subject,
            topics: getVisibleCycleTopics(subject.topics),
          }));
      }
      return subjects.map(subject => ({
        ...subject,
        topics: getVisibleCycleTopics(subject.topics),
      }));
    })();

    // 0a. Recalcular progresso para os subjects filtrados
    const filteredTopics = filteredSubjects.flatMap(s => s.topics);
    // Só contar revisões de tópicos já iniciados (excluir Não Iniciados)
    const startedTopics = filteredTopics.filter(t => !!(t.firstStudiedAt || t.first_studied_at));
    const filteredStudyProgress = {
      totalTopics: filteredTopics.length,
      completedTopics: filteredTopics.filter(t => t.completed).length,
      todayTopics: startedTopics.filter(t => t.nextReview && isToday(startOfDay(new Date(t.nextReview)))).length,
      delayedTopics: startedTopics.filter(t => t.nextReview && isBefore(startOfDay(new Date(t.nextReview)), startOfDay(now))).length,
      futureTopics: startedTopics.filter(t => t.nextReview && isAfter(startOfDay(new Date(t.nextReview)), startOfDay(now))).length,
    };

    // Calcular visão geral com dados reais
    const totalStudyTimeFromSessions = studySessions.reduce((sum, session) => 
      sum + (session.duration_minutes || session.session_duration_minutes || 0), 0);
    const totalStudyTimeFromPomodoro = pomodoroSessions.reduce((sum, session) => 
      sum + (session.total_minutes_studied || 0), 0);
    
    // Calcular tempo estimado baseado na dificuldade dos tópicos
    const estimatedTimeFromDifficulty = filteredSubjects.reduce((sum, subject) => {
      return sum + subject.topics.reduce((topicSum, topic) => {
        const difficultyTime = {
          1: 12, 2: 20, 3: 35
        };
        const difficulty = typeof topic.difficulty_level === 'number' ? topic.difficulty_level : 2;
        return topicSum + (topic.completed ? (difficultyTime[difficulty as keyof typeof difficultyTime] || 15) : 0);
      }, 0);
    }, 0);
    
    const totalStudyTime = getStatisticsStudyTime({
      sessionMinutes: totalStudyTimeFromSessions,
      reviewHistoryMinutes: reviewHistoryStudyMinutes,
      pomodoroMinutes: totalStudyTimeFromPomodoro,
      estimatedMinutes: estimatedTimeFromDifficulty,
      includePomodoro: filter.type === 'all',
    });
    
    const studyDays = new Set([
      ...studySessions.map(s => s.study_date).filter(Boolean),
      ...reviewHistoryStudyDates,
    ]);
    const daysWithSessions = studyDays.size;
    const averageDailyTime = daysWithSessions > 0 ? Math.round(totalStudyTime / daysWithSessions) : 0;

    const overview = {
      totalSubjects: filteredSubjects.length,
      completedSubjects: filteredSubjects.filter(s => s.status === 'Concluída').length,
      inProgressSubjects: filteredSubjects.filter(s => s.status === 'Em Estudo').length,
      notStartedSubjects: filteredSubjects.filter(s => s.status === 'Nova').length,
      totalTopics: filteredStudyProgress.totalTopics,
      completedTopics: filteredStudyProgress.completedTopics,
      inProgressTopics: filteredStudyProgress.totalTopics - filteredStudyProgress.completedTopics - filteredStudyProgress.futureTopics,
      notStartedTopics: filteredStudyProgress.futureTopics,
      totalReviews: filteredStudyProgress.totalTopics,
      completedReviews: filteredStudyProgress.completedTopics,
      pendingReviews: filteredStudyProgress.todayTopics,
      delayedReviews: filteredStudyProgress.delayedTopics,
      overallProgress: filteredStudyProgress.totalTopics > 0 
        ? Math.round((filteredStudyProgress.completedTopics / filteredStudyProgress.totalTopics) * 100) 
        : 0,
      totalStudyTime,
      averageDailyTime,
    };

    // Calcular revisões espaçadas com dados reais
    const allTopics = filteredSubjects.flatMap(s => s.topics);
    const spacedReviews = {
      stage24h: allTopics.filter(t => t.reviewStage === '24h').length,
      stage7d: allTopics.filter(t => t.reviewStage === '7 dias' || t.reviewStage === '7d').length,
      stage15d: allTopics.filter(t => t.reviewStage === '15 dias' || t.reviewStage === '15d').length,
      stage30d: allTopics.filter(t => t.reviewStage === '30 dias').length,
      stage60d: allTopics.filter(t => t.reviewStage === '60 dias' || t.reviewStage === '60d').length,
      stage90d: allTopics.filter(t => t.reviewStage === '90 dias' || t.reviewStage === '90d').length,
      completedOnTime: Math.floor(filteredStudyProgress.completedTopics * 0.85), // Estimativa baseada em padrões
      completedLate: Math.floor(filteredStudyProgress.completedTopics * 0.15),
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

    const subjectPerformance = filteredSubjects
      .map((subject) => {
        const sessionData = subjectSessionsMap.get(subject.id) || { sessions: 0, totalTime: 0 };
        const reviewHistoryTime = reviewHistoryStudyMinutesBySubject.get(subject.id) || 0;
        
        // Calcular tempo estimado baseado na dificuldade
        const estimatedTime = subject.topics.reduce((sum, topic) => {
          if (!topic.completed) return sum;
          const difficultyTime = {
            1: 12, 2: 20, 3: 35
          };
          const difficulty = typeof topic.difficulty_level === 'number' ? topic.difficulty_level : 2;
          return sum + (difficultyTime[difficulty as keyof typeof difficultyTime] || 15);
        }, 0);
        
        // Calcular pontuação baseada na dificuldade
        const difficultyPoints = subject.topics.reduce((sum, topic) => {
          if (!topic.completed) return sum;
          const points = {
            1: 1, 2: 3, 3: 6
          };
          const difficulty = typeof topic.difficulty_level === 'number' ? topic.difficulty_level : 2;
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
          studyTime: getStatisticsStudyTime({
            sessionMinutes: sessionData.totalTime,
            reviewHistoryMinutes: reviewHistoryTime,
            pomodoroMinutes: 0,
            estimatedMinutes: estimatedTime,
            includePomodoro: false,
          }),
          difficultyPoints,
          averageDifficulty: subject.topics.length > 0 
            ? subject.topics.reduce((sum, t) => sum + (typeof t.difficulty_level === 'number' ? t.difficulty_level : 2), 0) / subject.topics.length
            : 2,
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

    const hourProductivity = new Map<number, { sessions: number; topics: number }>();
    studySessions.forEach(session => {
      const current = hourProductivity.get(session.hour_of_day) || { sessions: 0, topics: 0 };
      hourProductivity.set(session.hour_of_day, {
        sessions: current.sessions + 1,
        topics: current.topics + (session.topics_count || 0)
      });
    });

    const mostProductiveHourEntry = Array.from(hourProductivity.entries())
      .sort(([,a], [,b]) => (b.topics / b.sessions) - (a.topics / a.sessions))[0];
    const mostProductiveHourNum = mostProductiveHourEntry ? mostProductiveHourEntry[0] : null;

    const studyHabits = {
      currentStreak: userAnalytics?.streak_atual || 0,
      longestStreak: userAnalytics?.maior_streak || 0,
      mostProductiveDay: dayNames[mostProductiveDayNum] || 'Segunda',
      mostProductiveHour: mostProductiveHourNum !== null ? `${mostProductiveHourNum.toString().padStart(2, '0')}:00` : null,
      averageSessionTime: userAnalytics?.media_duracao_sessao || 
        (studySessions.length > 0 ? Math.round(studySessions.reduce((sum, s) => sum + (s.duration_minutes || s.session_duration_minutes || 0), 0) / studySessions.length) : 45),
      averageTopicsPerDay: userAnalytics?.media_sessoes_por_dia || 
        (studySessions.length > 0 ? Math.round(studySessions.reduce((sum, s) => sum + (s.topics_count || 0), 0) / daysWithSessions) : 3),
      consistencyRate: daysWithSessions > 0 ? Math.round((daysWithSessions / 30) * 100) : 0,
    };

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
      goalsAchieved: Math.floor(studyHabits.consistencyRate / 20),
    };

    const insights = [];
    
    if (studyHabits.currentStreak >= 3) {
      insights.push({
        id: 'streak-medium',
        type: 'streak' as const,
        message: `${studyHabits.currentStreak} dias consecutivos. Continue assim!`,
        icon: 'Flame',
        priority: 'medium' as const,
      });
    }

    const hardTopicsCompleted = filteredSubjects.reduce((sum, subject) => {
      return sum + subject.topics.filter(t => t.completed && (typeof t.difficulty_level === 'number' ? t.difficulty_level : 0) >= 3).length;
    }, 0);

    if (hardTopicsCompleted >= 5) {
      insights.push({
        id: 'hard-topics-master',
        type: 'achievement' as const,
        message: `Dominou ${hardTopicsCompleted} tópicos difíceis`,
        icon: 'Award',
        priority: 'high' as const,
      });
    }

    const easyTopicsPending = filteredSubjects.reduce((sum, subject) => {
      return sum + subject.topics.filter(t => !t.completed && (typeof t.difficulty_level === 'number' ? t.difficulty_level : 0) <= 1).length;
    }, 0);

    if (easyTopicsPending >= 3) {
      insights.push({
        id: 'quick-wins',
        type: 'productivity' as const,
        message: `${easyTopicsPending} tópicos fáceis esperando!`,
        icon: 'Zap',
        priority: 'medium' as const,
      });
    }

    // Calcular estatísticas de dificuldade avançadas
    const allTopicsWithDifficulty = filteredSubjects.flatMap(s => 
      s.topics.map(t => ({ ...t, subjectName: s.name }))
    );
    const ratedTopics = allTopicsWithDifficulty.filter(t => t.difficulty_level && typeof t.difficulty_level === 'number');
    const completedTopics = allTopicsWithDifficulty.filter(t => t.completed);
    const completedRatedTopics = completedTopics.filter(t => t.difficulty_level && typeof t.difficulty_level === 'number');
    
    const difficultyDistribution: { [key: string]: number } = { '1': 0, '2': 0, '3': 0, 'unrated': 0 };
    const completedDistribution: { [key: string]: number } = { '1': 0, '2': 0, '3': 0 };
    let totalDifficulty = 0, totalCompletedDifficulty = 0, totalPoints = 0, completedPoints = 0, estimatedTime = 0, completedTime = 0;
    let hardestCompletedTopic: DifficultyTopicInsight | null = null;
    let maxCompletedDifficulty = 0;
    const easiestPendingTopics: DifficultyTopicInsight[] = [];
    
    allTopicsWithDifficulty.forEach(topic => {
      const difficulty = topic.difficulty_level;
      if (difficulty && typeof difficulty === 'number') {
        difficultyDistribution[String(difficulty)]++;
        totalDifficulty += difficulty;
        const points = { 1: 10, 2: 25, 3: 50 };
        const timeMap = { 1: 20, 2: 30, 3: 45 };
        totalPoints += points[difficulty as keyof typeof points] || 50;
        estimatedTime += timeMap[difficulty as keyof typeof timeMap] || 30;
        
        if (topic.completed) {
          completedDistribution[String(difficulty)]++;
          totalCompletedDifficulty += difficulty;
          completedPoints += points[difficulty as keyof typeof points] || 50;
          completedTime += timeMap[difficulty as keyof typeof timeMap] || 30;
          if (difficulty > maxCompletedDifficulty) {
            maxCompletedDifficulty = difficulty;
            hardestCompletedTopic = { name: topic.name, difficulty, subject: topic.subjectName };
          }
        } else if (difficulty <= 1) {
          easiestPendingTopics.push({ name: topic.name, difficulty, subject: topic.subjectName });
        }
      } else {
        difficultyDistribution['unrated']++;
        totalPoints += 50; estimatedTime += 30;
        if (topic.completed) { completedPoints += 50; completedTime += 30; }
        else { easiestPendingTopics.push({ name: topic.name, difficulty: 0, subject: topic.subjectName }); }
      }
    });

    const difficultyStats = {
      totalTopics: allTopicsWithDifficulty.length,
      ratedTopics: ratedTopics.length,
      completedTopics: completedTopics.length,
      completedRatedTopics: completedRatedTopics.length,
      averageDifficulty: ratedTopics.length > 0 ? totalDifficulty / ratedTopics.length : 2,
      averageCompletedDifficulty: completedRatedTopics.length > 0 ? totalCompletedDifficulty / completedRatedTopics.length : 0,
      difficultyDistribution,
      completedDistribution,
      totalPoints,
      completedPoints,
      estimatedTime,
      completedTime,
      efficiencyByDifficulty: [1, 2, 3].map(level => ({
        level,
        total: difficultyDistribution[String(level)] || 0,
        completed: completedDistribution[String(level)] || 0,
        efficiency: (difficultyDistribution[String(level)] || 0) > 0 ? Math.round((completedDistribution[String(level)] / difficultyDistribution[String(level)]) * 100) : 0
      })),
      ratingProgress: allTopicsWithDifficulty.length > 0 ? Math.round((ratedTopics.length / allTopicsWithDifficulty.length) * 100) : 0,
      completionProgress: ratedTopics.length > 0 ? Math.round((completedRatedTopics.length / ratedTopics.length) * 100) : 0,
      hardestCompletedTopic,
      easiestPendingTopics: easiestPendingTopics.sort((a,b) => a.difficulty - b.difficulty).slice(0, 5)
    };

    return { overview, spacedReviews, subjectPerformance, studyHabits, evolution, insights, difficultyStats };
  }, [subjects, filter.type, userCycle?.ciclo_atual, studySessions, userAnalytics, pomodoroSessions, reviewHistoryStudyMinutes, reviewHistoryStudyDates, reviewHistoryStudyMinutesBySubject]);
};
