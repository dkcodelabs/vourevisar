import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Coffee, BookOpen } from 'lucide-react';

interface PomodoroCardProps {
  className?: string;
}

export const PomodoroCard: React.FC<PomodoroCardProps> = ({ className = '' }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutos em segundos
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Timer acabou
      if (isBreak) {
        // Fim do intervalo, volta para sessão de trabalho
        setTimeLeft(25 * 60);
        setIsBreak(false);
      } else {
        // Fim da sessão de trabalho
        setSessions(prev => prev + 1);
        setTimeLeft(5 * 60); // 5 minutos de pausa
        setIsBreak(true);
      }
      setIsActive(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, isBreak]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(isBreak ? 5 * 60 : 25 * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const totalTime = isBreak ? 5 * 60 : 25 * 60;
    return ((totalTime - timeLeft) / totalTime) * 100;
  };

  return (
    <Card className={`bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 rounded-full bg-green-500" />
          <div className="flex items-center gap-2">
            {isBreak ? (
              <Coffee className="h-5 w-5 text-orange-500" />
            ) : (
              <BookOpen className="h-5 w-5 text-blue-500" />
            )}
            <span className="font-bold text-gray-800 text-base uppercase">
              {isBreak ? 'PAUSA' : 'POMODORO'}
            </span>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="text-4xl font-mono font-bold text-gray-900 mb-2">
            {formatTime(timeLeft)}
          </div>
          <div className="text-sm text-gray-500 mb-4">
            {isBreak ? 'Tempo de descanso' : 'Tempo de foco'}
          </div>
          
          {/* Barra de progresso */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className={`h-2 rounded-full transition-all duration-1000 ${
                isBreak ? 'bg-orange-500' : 'bg-green-500'
              }`}
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
              isActive 
                ? 'bg-red-50 hover:bg-red-100 text-red-600' 
                : 'bg-green-50 hover:bg-green-100 text-green-600'
            }`}
          >
            {isActive ? (
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
            {sessions}
          </div>
        </div>

        {/* Indicadores de sessão */}
        <div className="flex justify-center gap-1 mt-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < sessions % 4 ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};