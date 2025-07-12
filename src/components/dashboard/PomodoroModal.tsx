import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';
import { usePomodoroTimer } from '@/hooks/usePomodoroTimer';

interface PomodoroModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PomodoroModal: React.FC<PomodoroModalProps> = ({ open, onOpenChange }) => {
  const { 
    minutes, 
    timeLeft, 
    state, 
    progress, 
    setMinutes, 
    startTimer, 
    pauseTimer, 
    resetTimer, 
    formatTime 
  } = usePomodoroTimer();

  const handleStartPause = () => {
    if (state === 'running') {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  const getStateColor = () => {
    switch (state) {
      case 'running': return '#10B981'; // green
      case 'paused': return '#EF4444';  // red
      default: return '#6B7280';        // gray
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5" />
            Pomodoro Timer
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Configuração de Tempo */}
          <div className="space-y-2">
            <Label htmlFor="minutes">Minutos</Label>
            <Input
              id="minutes"
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value) || 1)}
              min="1"
              max="60"
              disabled={state !== 'stopped'}
              className="text-center"
            />
          </div>

          {/* Display do Timer */}
          <div className="text-center space-y-3">
            <div className="relative w-24 h-24 mx-auto">
              {/* Círculo de progresso */}
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#E5E7EB"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke={getStateColor()}
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - progress / 100)}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              
              {/* Tempo no centro */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold" style={{ color: getStateColor() }}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
            
            {/* Status */}
            <div className="text-sm text-gray-600">
              {state === 'running' && 'Timer rodando'}
              {state === 'paused' && 'Timer pausado'}
              {state === 'stopped' && 'Timer parado'}
            </div>
          </div>

          {/* Controles */}
          <div className="flex justify-center gap-2">
            <Button
              onClick={handleStartPause}
              variant={state === 'running' ? "secondary" : "default"}
              size="sm"
              className="flex items-center gap-2"
            >
              {state === 'running' ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  {state === 'paused' ? 'Continuar' : 'Iniciar'}
                </>
              )}
            </Button>
            
            <Button
              onClick={resetTimer}
              variant="outline"
              size="sm"
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