import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';

interface PomodoroModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PomodoroModal: React.FC<PomodoroModalProps> = ({ open, onOpenChange }) => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // em segundos

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      // Aqui você pode adicionar notificação ou som
      alert('Pomodoro concluído!');
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const handleStart = () => {
    if (!isRunning) {
      setTimeLeft(minutes * 60 + seconds);
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(minutes * 60 + seconds);
  };

  const handleTimeChange = () => {
    setTimeLeft(minutes * 60 + seconds);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = ((minutes * 60 + seconds - timeLeft) / (minutes * 60 + seconds)) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5" />
            Pomodoro Timer
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Configuração de Tempo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minutes">Minutos</Label>
              <Input
                id="minutes"
                type="number"
                value={minutes}
                onChange={(e) => {
                  setMinutes(Math.max(1, parseInt(e.target.value) || 1));
                  if (!isRunning) handleTimeChange();
                }}
                min="1"
                max="60"
                disabled={isRunning}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seconds">Segundos</Label>
              <Input
                id="seconds"
                type="number"
                value={seconds}
                onChange={(e) => {
                  setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)));
                  if (!isRunning) handleTimeChange();
                }}
                min="0"
                max="59"
                disabled={isRunning}
              />
            </div>
          </div>

          {/* Display do Timer */}
          <div className="text-center space-y-4">
            <div className="relative w-32 h-32 mx-auto">
              {/* Círculo de progresso */}
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="#E5E7EB"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="#3B82F6"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={2 * Math.PI * 50 * (1 - progressPercentage / 100)}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              
              {/* Tempo no centro */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-800">
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
          </div>

          {/* Controles */}
          <div className="flex justify-center gap-3">
            <Button
              onClick={handleStart}
              variant={isRunning ? "secondary" : "default"}
              size="lg"
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Iniciar
                </>
              )}
            </Button>
            
            <Button
              onClick={handleReset}
              variant="outline"
              size="lg"
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};