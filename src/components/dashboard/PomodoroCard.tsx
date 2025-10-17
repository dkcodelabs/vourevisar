import React from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSharedPomodoroTimer } from '@/hooks/useSharedPomodoroTimer';

export const PomodoroCard: React.FC = () => {
  const {
    timeLeft,
    isRunning,
    sessionsToday,
    initialTime,
    isBlinking,
    toggleTimer,
    resetTimer,
    formatTime,
    getProgress
  } = useSharedPomodoroTimer();

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">Pomodoro Timer</p>
          <p className={`text-2xl font-bold mb-1 transition-all duration-300 ${
            isBlinking ? 'text-red-500 animate-pulse' : 'text-gray-900'
          }`}>
            {timeLeft === 0 && isBlinking ? '00:00' : formatTime(timeLeft)}
          </p>
          <p className="text-sm text-gray-500">
            {isRunning ? 'Tempo de foco' : 'Pronto para começar'}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          isRunning ? 'bg-green-50' : 'bg-gray-50'
        }`}>
          <Clock size={24} className={isRunning ? 'text-green-500' : 'text-gray-500'} />
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className="bg-red-500 h-2 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${getProgress()}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          onClick={toggleTimer}
          size="sm"
          className={`text-white ${
            isRunning 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-green-500 hover:bg-green-600'
          }`}
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
          {Math.round(getProgress())}%
        </span>
      </div>
    </div>
  );
};