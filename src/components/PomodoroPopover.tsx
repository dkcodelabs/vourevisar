import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Timer, Minus, Plus } from 'lucide-react';
import { useSharedPomodoroTimer } from '@/hooks/useSharedPomodoroTimer';

interface PomodoroPopoverProps {
  children: React.ReactNode;
}

export const PomodoroPopover: React.FC<PomodoroPopoverProps> = ({ children }) => {
  const {
    timeLeft,
    isRunning,
    sessionsToday,
    initialTime,
    isBlinking,
    toggleTimer,
    resetTimer,
    adjustTime,
    formatTime,
    getProgress
  } = useSharedPomodoroTimer();

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 shadow-lg border-0 md:w-80 max-w-[calc(100vw-2rem)]"
        align="end"
        sideOffset={8}
        alignOffset={-40}
      >
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mx-auto">
          {/* Header com Sessões no canto */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 rounded-full bg-green-500" />
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-red-500" />
                <span className="font-bold text-gray-800 text-base">Pomodoro</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Sessões hoje</div>
              <div className="text-lg font-bold text-green-600">{sessionsToday}</div>
            </div>
          </div>
          
          {/* Timer Central */}
          <div className="text-center mb-6">
            <div className={`text-5xl font-mono font-bold mb-2 transition-all duration-300 ${
              isBlinking 
                ? 'text-red-500 animate-pulse' 
                : 'text-gray-900'
            }`}>
              {timeLeft === 0 && isBlinking ? '00:00' : formatTime(timeLeft)}
            </div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => adjustTime(-5)}
                disabled={isRunning}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 rounded-full"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-500 min-w-[60px]">
                {Math.round(initialTime / 60)} min
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => adjustTime(5)}
                disabled={isRunning}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 rounded-full"
              >
                <Plus className="h-4 w-4" />
              </Button>
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
          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={toggleTimer}
              className={`h-12 w-full rounded-xl font-medium transition-all duration-200 ${
                isRunning 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pausar Foco
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Foco
                </>
              )}
            </Button>
            <Button
              onClick={resetTimer}
              variant="outline"
              className="h-12 w-12 p-0 rounded-xl border-gray-300 hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};