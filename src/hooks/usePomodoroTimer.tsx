import { useState, useEffect, useCallback } from 'react';

export type PomodoroState = 'stopped' | 'running' | 'paused';

interface PomodoroTimer {
  minutes: number;
  timeLeft: number; // em segundos
  state: PomodoroState;
  progress: number; // 0-100
  setMinutes: (minutes: number) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  formatTime: (seconds: number) => string;
}

export const usePomodoroTimer = (): PomodoroTimer => {
  const [minutes, setMinutesState] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [state, setState] = useState<PomodoroState>('stopped');
  const [initialTime, setInitialTime] = useState(25 * 60);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (state === 'running' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            // Timer finished
            setState('stopped');
            playAlarmSound();
            showNotification();
            return initialTime; // Reset to initial time
          }
          return time - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [state, timeLeft, initialTime]);

  // Play alarm sound when timer finishes
  const playAlarmSound = useCallback(() => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Play 3 beeps
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 800; // Frequency in Hz
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
        }, i * 400);
      }
    } catch (error) {
      // Fallback to browser alert if Web Audio API fails
      alert('⏰ Pomodoro concluído!');
    }
  }, []);

  // Show visual notification
  const showNotification = useCallback(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🍅 Pomodoro concluído!', {
        body: 'Tempo para uma pausa!',
        icon: '/favicon.ico'
      });
    }
  }, []);

  // Request notification permission on first load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const setMinutes = useCallback((newMinutes: number) => {
    const clampedMinutes = Math.max(1, Math.min(60, newMinutes));
    setMinutesState(clampedMinutes);
    
    if (state === 'stopped') {
      const newTime = clampedMinutes * 60;
      setTimeLeft(newTime);
      setInitialTime(newTime);
    }
  }, [state]);

  const startTimer = useCallback(() => {
    if (state === 'stopped') {
      const newTime = minutes * 60;
      setTimeLeft(newTime);
      setInitialTime(newTime);
    }
    setState('running');
  }, [state, minutes]);

  const pauseTimer = useCallback(() => {
    setState('paused');
  }, []);

  const resetTimer = useCallback(() => {
    setState('stopped');
    const newTime = minutes * 60;
    setTimeLeft(newTime);
    setInitialTime(newTime);
  }, [minutes]);

  const formatTime = useCallback((totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Calculate progress percentage
  const progress = initialTime > 0 ? Math.round(((initialTime - timeLeft) / initialTime) * 100) : 0;

  return {
    minutes,
    timeLeft,
    state,
    progress,
    setMinutes,
    startTimer,
    pauseTimer,
    resetTimer,
    formatTime
  };
};