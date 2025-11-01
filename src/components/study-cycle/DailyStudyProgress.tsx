import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { BookOpen, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { useDailyStudyProgress } from '@/hooks/useDailyStudyProgress';

interface DailyStudyProgressProps {
  className?: string;
}

export const DailyStudyProgress: React.FC<DailyStudyProgressProps> = ({
  className = ''
}) => {
  const {
    dailyProgress,
    userCycle,
    isLoading,
    resetDailyProgress,
    resetReason
  } = useDailyStudyProgress();

  // Estados do componente colapsável
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandMode, setExpandMode] = useState<'manual' | 'auto' | null>(null);
  const [autoCollapseTimer, setAutoCollapseTimer] = useState<NodeJS.Timeout | null>(null);

  // Log removido para otimização

  // Auto-expansão SIMPLES
  useEffect(() => {
    const shouldExpand = resetReason === 'new_cycle' || dailyProgress.progressPercentage >= 100;
    
    if (shouldExpand) {
      // Limpar timer anterior
      setAutoCollapseTimer(prev => {
        if (prev) clearTimeout(prev);
        return null;
      });

      // Expandir
      setIsExpanded(true);
      setExpandMode('auto');

      // Auto-colapsar após 6 segundos
      const timer = setTimeout(() => {
        setIsExpanded(false);
        setExpandMode(null);
        setAutoCollapseTimer(null);
      }, 6000);

      setAutoCollapseTimer(timer);
    }
  }, [resetReason, dailyProgress.progressPercentage]); // Remover autoCollapseTimer das dependências



  // Função para toggle manual
  const handleToggleExpand = () => {
    // Limpar timer se estiver em modo auto
    setAutoCollapseTimer(prev => {
      if (prev) clearTimeout(prev);
      return null;
    });

    // Toggle do estado
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    setExpandMode(newExpanded ? 'manual' : null);
  };

  // Se não há dados, não renderizar
  if (!userCycle && !isLoading) {
    return null;
  }

  // DESABILITADO TEMPORARIAMENTE - estava causando loading infinito
  if (isLoading) {
    return null; // Não mostrar nada quando carregando
  }

  return (
    <Card className={`bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 transition-all duration-300 ${className}`}>
      {/* Header sempre visível - Compacto */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-medium text-blue-900">
              📚 Estudo do Dia: {dailyProgress.studiedCount} de {dailyProgress.dailyGoal} matérias
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              variant="secondary" 
              className="bg-blue-100 text-blue-800 border-blue-300 text-xs px-2 py-1"
            >
              {dailyProgress.progressPercentage}%
            </Badge>
            {process.env.NODE_ENV === 'development' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetDailyProgress}
                className="text-gray-500 hover:text-gray-700 h-6 w-6 p-0"
                title="Reset progresso (apenas desenvolvimento)"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleExpand}
              className="text-blue-600 hover:text-blue-800 h-6 w-6 p-0"
              title={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {/* Barra de progresso sempre visível - Compacta */}
        <div className="mt-2">
          <Progress 
            value={dailyProgress.progressPercentage} 
            className="h-2 bg-blue-100"
          />
          <div className="flex justify-between text-xs text-blue-600 mt-1">
            <span>Início</span>
            <span>{dailyProgress.remainingCount} restantes</span>
            <span>Meta diária</span>
          </div>
        </div>
      </CardHeader>

      {/* Conteúdo expansível */}
      {isExpanded && (
        <CardContent className="pt-0 pb-3">
          <div className="border-t border-blue-200 pt-3"></div>

          {/* Mensagens SIMPLES - Prioridade: novo ciclo > meta concluída */}
          <div className="space-y-2">
            {resetReason === 'new_cycle' ? (
              /* NOVO CICLO - Prioridade máxima */
              <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-center">
                <div className="text-base mb-1">🔄</div>
                <h4 className="font-medium text-xs text-indigo-800">
                  Novo ciclo iniciado!
                </h4>
                <p className="text-xs text-indigo-600 mt-1">
                  Sua meta diária foi resetada para o novo ciclo
                </p>
              </div>
            ) : dailyProgress.progressPercentage >= 100 ? (
              /* META CONCLUÍDA */
              <div className={`${dailyProgress.studiedCount > dailyProgress.dailyGoal ? 'grid grid-cols-1 md:grid-cols-2 gap-2' : ''}`}>
                <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-center">
                  <div className="text-base mb-1">✅</div>
                  <h4 className="font-medium text-xs text-green-800">
                    Meta diária concluída!
                  </h4>
                </div>
                
                {/* ESTUDOU ALÉM DA META */}
                {dailyProgress.studiedCount > dailyProgress.dailyGoal && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-center">
                    <div className="text-sm mb-1">💪</div>
                    <p className="text-xs font-medium text-blue-800">
                      Você estudou além da meta hoje
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Continue assim para acelerar seu progresso!
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {/* Dica de flexibilidade */}
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                💡 <strong>Dica:</strong> Você pode estudar fora da ordem se preferir. 
                O progresso será mantido independente da sequência!
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};