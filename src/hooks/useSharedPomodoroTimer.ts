import { useState, useEffect, useCallback, useRef } from 'react';

// Estado global compartilhado
let globalState = {
  timeLeft: 25 * 60,
  isRunning: false,
  sessionsToday: 0,
  initialTime: 25 * 60,
  isBlinking: false,
  listeners: new Set<() => void>()
};

// Timer global único
let globalInterval: NodeJS.Timeout | null = null;

const startGlobalTimer = () => {
  if (globalInterval) return;
  
  globalInterval = setInterval(() => {
    if (globalState.isRunning && globalState.timeLeft > 0) {
      globalState.timeLeft -= 1;
      globalState.listeners.forEach(listener => listener());
    } else if (globalState.timeLeft === 0 && globalState.isRunning) {
      globalState.isRunning = false;
      globalState.sessionsToday += 1;
      globalState.isBlinking = true;
      
      // Para o piscar após 3 segundos e reseta o timer
      setTimeout(() => {
        globalState.isBlinking = false;
        globalState.timeLeft = globalState.initialTime;
        globalState.listeners.forEach(listener => listener());
      }, 3000);
      
      globalState.listeners.forEach(listener => listener());
    }
  }, 1000);
};

const stopGlobalTimer = () => {
  if (globalInterval) {
    clearInterval(globalInterval);
    globalInterval = null;
  }
};

export const useSharedPomodoroTimer = () => {
  const [, forceUpdate] = useState({});
  const updateRef = useRef(() => forceUpdate({}));

  // Atualizar a referência sem causar re-render
  updateRef.current = () => forceUpdate({});

  // Registrar listener para updates
  useEffect(() => {
    const listener = () => updateRef.current();
    globalState.listeners.add(listener);
    
    // Iniciar timer global se necessário
    if (globalState.listeners.size === 1) {
      startGlobalTimer();
    }
    
    return () => {
      globalState.listeners.delete(listener);
      
      // Parar timer global se não há mais listeners
      if (globalState.listeners.size === 0) {
        stopGlobalTimer();
      }
    };
  }, []);

  const toggleTimer = useCallback(() => {
    globalState.isRunning = !globalState.isRunning;
    globalState.listeners.forEach(listener => listener());
  }, []);

  const resetTimer = useCallback(() => {
    globalState.isRunning = false;
    globalState.isBlinking = false;
    globalState.timeLeft = globalState.initialTime;
    globalState.listeners.forEach(listener => listener());
  }, []);

  const adjustTime = useCallback((minutes: number) => {
    if (!globalState.isRunning) {
      const newTime = Math.max(5 * 60, Math.min(60 * 60, globalState.initialTime + (minutes * 60)));
      globalState.initialTime = newTime;
      globalState.timeLeft = newTime;
      globalState.listeners.forEach(listener => listener());
    }
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getProgress = useCallback(() => {
    return ((globalState.initialTime - globalState.timeLeft) / globalState.initialTime) * 100;
  }, []);

  const getState = useCallback(() => {
    return globalState.isRunning ? 'running' : globalState.timeLeft < globalState.initialTime ? 'paused' : 'stopped';
  }, []);

  return {
    timeLeft: globalState.timeLeft,
    isRunning: globalState.isRunning,
    sessionsToday: globalState.sessionsToday,
    initialTime: globalState.initialTime,
    isBlinking: globalState.isBlinking,
    toggleTimer,
    resetTimer,
    adjustTime,
    formatTime,
    getProgress,
    getState
  };
};