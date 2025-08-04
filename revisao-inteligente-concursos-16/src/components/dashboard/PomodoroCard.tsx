import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const PomodoroCard: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  
  const workTime = 25 * 60;
  const breakTime = 5 * 60;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      // Switch mode when timer ends
      if (mode === 'work') {
        setMode('break');
        setTimeLeft(breakTime);
      } else {
        setMode('work');
        setTimeLeft(workTime);
      }
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode, workTime, breakTime]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'work' ? workTime : breakTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const percentage = mode === 'work' 
    ? ((workTime - timeLeft) / workTime) * 100
    : ((breakTime - timeLeft) / breakTime) * 100;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">Pomodoro Timer</p>
          <p className="text-2xl font-bold text-gray-900">{formatTime(timeLeft)}</p>
          <p className="text-sm text-gray-500">
            {mode === 'work' ? 'Tempo de foco' : 'Tempo de pausa'}
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
          <Clock size={24} className="text-red-500" />
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className="bg-red-500 h-2 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          onClick={toggleTimer}
          size="sm"
          className="bg-red-500 hover:bg-red-600 text-white"
        >
          {isRunning ? <Pause size={16} /> : <Play size={16} />}
        </Button>
        <Button
          onClick={resetTimer}
          size="sm"
          variant="outline"
          className="border-gray-300"
        >
          <RotateCcw size={16} />
        </Button>
        <span className="text-xs text-gray-500 ml-auto">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
};