import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import type { Tables } from '@/integrations/supabase/types';
import { useStudySessionTracking } from './useStudySessionTracking';

type PomodoroSession = Tables<'pomodoro_sessions'>;

export const usePomodoroTimer = () => {
  const { user } = useAuth();
  const { recordPomodoroSession } = useStudySessionTracking();
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutos em segundos
  const [initialTime, setInitialTime] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [totalMinutesToday, setTotalMinutesToday] = useState(0);
  const [wasReset, setWasReset] = useState(false); // Controla se foi resetado durante a sessão

  // Buscar sessões do dia atual
  const fetchTodaySessions = useCallback(async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
      const { data, error } = await supabase
        .from('pomodoro_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', today)
        .lte('date', today)
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar sessões:', error);
        setSessionsToday(0);
        setTotalMinutesToday(0);
        return;
      }

      const sessionData = data?.[0] || null;

      if (sessionData) {
        setSessionsToday(sessionData.sessions_completed || 0);
        setTotalMinutesToday(sessionData.total_minutes_studied || 0);
      } else {
        setSessionsToday(0);
        setTotalMinutesToday(0);
      }
    } catch (error) {
      console.error('Erro ao buscar sessões:', error);
      setSessionsToday(0);
      setTotalMinutesToday(0);
    }
  }, [user]);

  // Salvar/atualizar sessão no banco
  const updateSessionInDB = useCallback(async (completedSessions: number, totalMinutes: number) => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    try {
      const { data: existingSession } = await supabase
        .from('pomodoro_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', today)
        .lte('date', today)
        .limit(1);

      const existingSession = (data as any[])?.[0] || null;

      if (existingSession) {
        // Atualizar sessão existente
        const { error } = await supabase
          .from('pomodoro_sessions')
          .update({
            sessions_completed: completedSessions,
            total_minutes_studied: totalMinutes,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSession.id);

        if (error) throw error;
      } else {
        // Criar nova sessão
        const { error } = await supabase
          .from('pomodoro_sessions')
          .insert({
            user_id: user.id,
            date: today,
            sessions_completed: completedSessions,
            total_minutes_studied: totalMinutes
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Erro ao salvar sessão do Pomodoro:', error);
      toast.error('Erro ao salvar sessão do Pomodoro');
    }
  }, [user]);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive && !wasReset) {
      // Timer acabou SEM ter sido resetado - sessão válida (pausar e continuar é OK)
      setIsActive(false);
      const newSessions = sessionsToday + 1;
      const studiedMinutes = Math.round(initialTime / 60);
      const newTotalMinutes = totalMinutesToday + studiedMinutes;

      setSessionsToday(newSessions);
      setTotalMinutesToday(newTotalMinutes);

      // Salvar no banco
      updateSessionInDB(newSessions, newTotalMinutes);

      // Registrar no sistema de tracking
      recordPomodoroSession(newSessions, newTotalMinutes);

      // Reset timer para próxima sessão
      setTimeLeft(initialTime);
      setWasReset(false); // Reset flag

      // Notificação de sessão completa
      toast.success(`🎉 Sessão Pomodoro completa! ${studiedMinutes} minutos estudados.`, {
        duration: 4000,
      });
    } else if (timeLeft === 0 && isActive && wasReset) {
      // Timer acabou MAS foi resetado - não conta como sessão válida
      setIsActive(false);
      setTimeLeft(initialTime);
      setWasReset(false); // Reset flag

      // Notificação informando que não contou
      toast.info('🔄 Timer finalizado, mas não contou como sessão (foi resetado)', {
        duration: 3000,
      });
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, initialTime, sessionsToday, totalMinutesToday, updateSessionInDB, wasReset]);

  // Carregar dados ao inicializar
  useEffect(() => {
    fetchTodaySessions();
  }, [fetchTodaySessions]);

  // Funções de controle
  const startTimer = () => setIsActive(true);
  const pauseTimer = () => {
    setIsActive(false);
    // Pausar não afeta a contagem - pode pausar e continuar normalmente
  };
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(initialTime);
    setWasReset(true); // Marca que foi resetado - não conta sessão
  };

  const adjustTime = (minutes: number) => {
    if (!isActive) {
      const newTime = Math.max(5 * 60, initialTime + (minutes * 60)); // Mínimo 5 minutos
      const maxTime = 60 * 60; // Máximo 60 minutos
      const finalTime = Math.min(newTime, maxTime);

      setInitialTime(finalTime);
      setTimeLeft(finalTime);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    return ((initialTime - timeLeft) / initialTime) * 100;
  };

  const getSessionsProgress = () => {
    const maxSessions = 8; // Meta diária
    return (sessionsToday / maxSessions) * 100;
  };

  return {
    timeLeft,
    initialTime,
    isActive,
    sessionsToday,
    totalMinutesToday,
    startTimer,
    pauseTimer,
    resetTimer,
    adjustTime,
    formatTime,
    getProgress,
    getSessionsProgress,
    maxSessions: 8
  };
};