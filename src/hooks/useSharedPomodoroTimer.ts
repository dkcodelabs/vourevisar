import { useState, useEffect, useCallback, useRef } from 'react';

// Função para carregar estado do localStorage
const loadStateFromStorage = () => {
  try {
    const saved = localStorage.getItem('pomodoroState');
    if (saved) {
      const parsed = JSON.parse(saved);
      const today = new Date().toDateString();

      // Se é um novo dia, resetar sessões
      if (parsed.lastDate !== today) {
        return {
          timeLeft: 25 * 60,
          isRunning: false,
          sessionsToday: 0,
          initialTime: 25 * 60,
          isBlinking: false,
          lastDate: today,
          listeners: new Set<() => void>()
        };
      }

      // Se estava rodando, recalcular o tempo baseado no timestamp
      let adjustedTimeLeft = parsed.timeLeft;
      if (parsed.isRunning && parsed.lastSaveTime) {
        const elapsedSeconds = Math.floor((Date.now() - parsed.lastSaveTime) / 1000);
        adjustedTimeLeft = Math.max(0, parsed.timeLeft - elapsedSeconds);
      }

      return {
        ...parsed,
        timeLeft: adjustedTimeLeft,
        isRunning: parsed.isRunning && adjustedTimeLeft > 0, // Continuar rodando se ainda tem tempo
        isBlinking: false,
        listeners: new Set<() => void>()
      };
    }
  } catch (error) {
    console.error('Erro ao carregar estado do pomodoro:', error);
  }

  return {
    timeLeft: 25 * 60,
    isRunning: false,
    sessionsToday: 0,
    initialTime: 25 * 60,
    isBlinking: false,
    lastDate: new Date().toDateString(),
    listeners: new Set<() => void>()
  };
};

// Função para salvar estado no localStorage
const saveStateToStorage = (state: unknown) => {
  try {
    const stateToSave = {
      timeLeft: state.timeLeft,
      isRunning: state.isRunning,
      sessionsToday: state.sessionsToday,
      initialTime: state.initialTime,
      lastDate: state.lastDate,
      lastSaveTime: Date.now() // Salvar timestamp para recalcular depois
    };
    localStorage.setItem('pomodoroState', JSON.stringify(stateToSave));
  } catch (error) {
    console.error('Erro ao salvar estado do pomodoro:', error);
  }
};

// Estado global compartilhado
const globalState = loadStateFromStorage();

// Timer global único com timestamp para precisão
let globalInterval: NodeJS.Timeout | null = null;
let lastTickTime: number | null = null;

const startGlobalTimer = () => {
  if (globalInterval) return;

  lastTickTime = Date.now();

  globalInterval = setInterval(() => {
    const now = Date.now();
    const elapsed = lastTickTime ? Math.floor((now - lastTickTime) / 1000) : 1;
    lastTickTime = now;

    if (globalState.isRunning && globalState.timeLeft > 0) {
      // Subtrair o tempo real decorrido, não apenas 1 segundo
      globalState.timeLeft = Math.max(0, globalState.timeLeft - elapsed);
      saveStateToStorage(globalState);
      globalState.listeners.forEach(listener => listener());
    }
    
    if (globalState.timeLeft === 0 && globalState.isRunning) {
      globalState.isRunning = false;
      globalState.sessionsToday += 1;
      globalState.isBlinking = true;
      saveStateToStorage(globalState);

      // Para o piscar após 3 segundos e reseta o timer
      setTimeout(() => {
        globalState.isBlinking = false;
        globalState.timeLeft = globalState.initialTime;
        saveStateToStorage(globalState);
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
    lastTickTime = null;
  }
};

// Listener para quando a aba volta a ficar ativa
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && globalState.isRunning) {
      // Recalcular tempo quando a aba volta a ficar ativa
      const saved = localStorage.getItem('pomodoroState');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isRunning && parsed.lastSaveTime) {
          const elapsedSeconds = Math.floor((Date.now() - parsed.lastSaveTime) / 1000);
          globalState.timeLeft = Math.max(0, parsed.timeLeft - elapsedSeconds);
          
          if (globalState.timeLeft === 0) {
            globalState.isRunning = false;
            globalState.sessionsToday += 1;
            globalState.isBlinking = true;
            
            setTimeout(() => {
              globalState.isBlinking = false;
              globalState.timeLeft = globalState.initialTime;
              saveStateToStorage(globalState);
              globalState.listeners.forEach(listener => listener());
            }, 3000);
          }
          
          saveStateToStorage(globalState);
          globalState.listeners.forEach(listener => listener());
          lastTickTime = Date.now(); // Resetar o timestamp
        }
      }
    }
  });
}

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
    saveStateToStorage(globalState);
    globalState.listeners.forEach(listener => listener());
  }, []);

  const resetTimer = useCallback(() => {
    globalState.isRunning = false;
    globalState.isBlinking = false;
    globalState.timeLeft = globalState.initialTime;
    saveStateToStorage(globalState);
    globalState.listeners.forEach(listener => listener());
  }, []);

  const adjustTime = useCallback((minutes: number) => {
    if (!globalState.isRunning) {
      const newTime = Math.max(5 * 60, Math.min(60 * 60, globalState.initialTime + (minutes * 60)));
      globalState.initialTime = newTime;
      globalState.timeLeft = newTime;
      saveStateToStorage(globalState);
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