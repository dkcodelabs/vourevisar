import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Coffee, BookOpen } from 'lucide-react';
import { useSharedPomodoroTimer } from '@/hooks/useSharedPomodoroTimer';

interface PomodoroCardProps {
  className?: string;
}

export const PomodoroCard: React.FC<PomodoroCardProps> = ({ className = '' }) => {
  const {
    timeLeft,
    isRunning,
    sessionsToday,
    initialTime,
    isBlinking,
    toggleTimer,
    resetTimer,
    formatTime,
    getProgress,
    getState
  } = useSharedPomodoroTimer();

  // Determinar se está em pausa baseado no tempo restante vs tempo inicial
  const isBreak = timeLeft < initialTime && timeLeft > 0 && !isRunning && getState() === 'paused';
  const currentState = getState();

  return (
    <Card className={`bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-1 h-6 rounded-full ${isRunning ? 'bg-green-500' : 'bg-gray-400'}`} />
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            <span className="font-bold text-gray-800 text-base uppercase">
              POMODORO
            </span>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className={`text-4xl font-mono font-bold mb-2 transition-all duration-300 ${
            isBlinking ? 'text-green-500 animate-pulse' : 'text-gray-900'
          }`}>
            {formatTime(timeLeft)}
          </div>
          <div className="text-sm text-gray-500 mb-4">
            {currentState === 'running' ? 'Tempo de foco' : 
             currentState === 'paused' ? 'Pausado' : 'Pronto para começar'}
          </div>
          
          {/* Barra de progresso */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="h-2 rounded-full transition-all duration-1000 bg-green-500"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTimer}
            className={`h-12 w-12 p-0 rounded-full transition-all duration-200 ${
              isRunning 
                ? 'bg-red-50 hover:bg-red-100 text-red-600' 
                : 'bg-green-50 hover:bg-green-100 text-green-600'
            }`}
          >
            {isRunning ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={resetTimer}
            className="h-12 w-12 p-0 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-600 transition-all duration-200"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>

        <div className="text-center">
          <div className="text-sm text-gray-500">
            Sessões completadas
          </div>
          <div className="text-2xl font-bold text-green-600">
            {sessionsToday}
          </div>
        </div>

        {/* Indicadores de sessão */}
        <div className="flex justify-center gap-1 mt-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < sessionsToday % 4 ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};