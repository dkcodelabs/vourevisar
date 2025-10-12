import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { BookOpen, Target, Clock, RotateCcw } from 'lucide-react';
import { useDailyStudyProgress } from '@/hooks/useDailyStudyProgress';
import { useApp } from '@/contexts/AppContext';

interface DailyStudyProgressProps {
  onSubjectClick?: (subjectId: string) => void;
  className?: string;
}

export const DailyStudyProgress: React.FC<DailyStudyProgressProps> = ({
  onSubjectClick,
  className = ''
}) => {
  const {
    dailyProgress,
    userCycle,
    isLoading,
    resetDailyProgress,
    resetReason
  } = useDailyStudyProgress();

  // Se não há dados, não renderizar
  if (!userCycle && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">
              📚 Estudo do Dia: {dailyProgress.studiedCount} de {dailyProgress.dailyGoal} matérias
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              variant="secondary" 
              className="bg-blue-100 text-blue-800 border-blue-300"
            >
              {dailyProgress.progressPercentage}%
            </Badge>
            {process.env.NODE_ENV === 'development' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetDailyProgress}
                className="text-gray-500 hover:text-gray-700"
                title="Reset progresso (apenas desenvolvimento)"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Barra de progresso */}
        <div className="mb-6">
          <Progress 
            value={dailyProgress.progressPercentage} 
            className="h-3 bg-blue-100"
          />
          <div className="flex justify-between text-xs text-blue-600 mt-1">
            <span>Início</span>
            <span>{dailyProgress.remainingCount} restantes</span>
            <span>Meta diária</span>
          </div>
        </div>

        {/* Mensagens Contextuais Inteligentes */}
        <div className="space-y-3">
          {/* Mensagem de novo ciclo */}
          {resetReason === 'new_cycle' && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-center">
              <div className="text-2xl mb-2">🔄</div>
              <h4 className="font-semibold text-indigo-800">
                Novo ciclo iniciado!
              </h4>
              <p className="text-xs text-indigo-600 mt-1">
                Sua meta diária foi resetada para o novo ciclo
              </p>
            </div>
          )}

          {/* Mensagem de novo dia */}
          {resetReason === 'new_day' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <div className="text-2xl mb-2">🌅</div>
              <h4 className="font-semibold text-blue-800">
                Novo dia, nova oportunidade!
              </h4>
              <p className="text-xs text-blue-600 mt-1">
                Sua meta diária foi resetada automaticamente
              </p>
            </div>
          )}

          {/* Mensagem de continuidade */}
          {resetReason === 'continue' && dailyProgress.studiedCount > 0 && dailyProgress.progressPercentage < 100 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
              <div className="text-lg mb-1">⏰</div>
              <p className="text-sm font-medium text-amber-800">
                Continue de onde parou!
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Você ainda tem {dailyProgress.remainingCount} matéria(s) para completar a meta
              </p>
            </div>
          )}

          {/* Meta alcançada */}
          {dailyProgress.progressPercentage >= 100 && (
            <div className="space-y-3">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <div className="text-2xl mb-2">✅</div>
                <h4 className="font-semibold text-green-800">
                  Meta diária concluída!
                </h4>
              </div>
              
              {/* Mensagem extra se estudou além da meta */}
              {dailyProgress.studiedCount > dailyProgress.dailyGoal && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <div className="text-lg mb-1">💪</div>
                  <p className="text-sm font-medium text-blue-800">
                    Você estudou além da meta hoje
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Continue assim para acelerar seu progresso!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Dica de flexibilidade */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 <strong>Dica:</strong> Você pode estudar fora da ordem se preferir. 
              O progresso será mantido independente da sequência!
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};