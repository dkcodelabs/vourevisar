import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getDay, getHours } from 'date-fns';

interface StudySessionData {
  subjectId: string;
  subjectName: string;
  topicsStudied?: string[];
  topicsCount?: number;
  durationMinutes?: number;
  startedAt?: Date;
  cycleId?: string;
  editalId?: string;
}

export const useStudySessionTracking = () => {
  const { user } = useAuth();

  const recordStudySession = useCallback(async (sessionData: StudySessionData) => {
    if (!user) return null;

    const now = new Date();
    const startTime = sessionData.startedAt || now;

    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          subject_id: sessionData.subjectId,
          subject_name: sessionData.subjectName,
          started_at: startTime.toISOString(),
          completed_at: now.toISOString(),
          study_date: now.toISOString().split('T')[0], // YYYY-MM-DD
          session_duration_minutes: sessionData.durationMinutes || 0,
          topics_studied: sessionData.topicsStudied || [],
          topics_count: sessionData.topicsCount || 0,
          hour_of_day: getHours(now),
          day_of_week: getDay(now) === 0 ? 7 : getDay(now), // Domingo = 7, Segunda = 1
          is_weekend: getDay(now) === 0 || getDay(now) === 6,
          cycle_id: sessionData.cycleId,
          edital_id: sessionData.editalId
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao registrar sessão de estudo:', error);
        return null;
      }

      // Atualizar progresso diário (se a função existir)
      try {
        await supabase.rpc('update_daily_progress' as never, {
          p_user_id: user.id,
          p_subject_id: sessionData.subjectId
        });
      } catch (rpcError) {
        console.log('Função update_daily_progress não encontrada, continuando...');
      }

      // Recalcular analytics do usuário
      try {
        await supabase.rpc('calculate_user_analytics' as never, {
          p_user_id: user.id
        });
      } catch (rpcError) {
        console.log('Erro ao recalcular analytics:', rpcError);
      }

      return data;
    } catch (error) {
      console.error('Erro ao registrar sessão:', error);
      return null;
    }
  }, [user]);

  const recordTopicCompletion = useCallback(async (
    subjectId: string,
    subjectName: string,
    topicId: string,
    topicName: string,
    sessionStartTime?: Date,
    durationMinutes?: number,
    cycleId?: string,
    editalId?: string
  ) => {
    return await recordStudySession({
      subjectId,
      subjectName,
      topicsStudied: [topicId],
      topicsCount: 1,
      durationMinutes: durationMinutes ?? (sessionStartTime ? Math.round((Date.now() - sessionStartTime.getTime()) / 60000) : 0),
      startedAt: sessionStartTime,
      cycleId,
      editalId
    });
  }, [recordStudySession]);

  const recordSubjectSession = useCallback(async (
    subjectId: string,
    subjectName: string,
    topicsCompleted: string[] = [],
    sessionDurationMinutes: number = 0,
    sessionStartTime?: Date
  ) => {
    return await recordStudySession({
      subjectId,
      subjectName,
      topicsStudied: topicsCompleted,
      topicsCount: topicsCompleted.length,
      durationMinutes: sessionDurationMinutes,
      startedAt: sessionStartTime,
    });
  }, [recordStudySession]);

  const recordPomodoroSession = useCallback(async (
    sessionsCompleted: number,
    totalMinutesStudied: number
  ) => {
    if (!user) return null;

    const today = new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('pomodoro_sessions')
        .upsert({
          user_id: user.id,
          date: today,
          sessions_completed: sessionsCompleted,
          total_minutes_studied: totalMinutesStudied,
        }, {
          onConflict: 'user_id,date'
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao registrar sessão pomodoro:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao registrar pomodoro:', error);
      return null;
    }
  }, [user]);

  const getStudySessionsForDate = useCallback(async (date: string) => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('study_date', date)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar sessões:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar sessões:', error);
      return [];
    }
  }, [user]);

  const getUserAnalytics = useCallback(async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('user_study_analytics')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar analytics:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar analytics:', error);
      return null;
    }
  }, [user]);

  const forceRecalculateAnalytics = useCallback(async () => {
    if (!user) return false;

    try {
      const { error } = await supabase.rpc('calculate_user_analytics' as never, {
        p_user_id: user.id
      });

      if (error) {
        console.error('Erro ao recalcular analytics:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao recalcular analytics:', error);
      return false;
    }
  }, [user]);

  return {
    recordStudySession,
    recordTopicCompletion,
    recordSubjectSession,
    recordPomodoroSession,
    getStudySessionsForDate,
    getUserAnalytics,
    forceRecalculateAnalytics,
  };
};
