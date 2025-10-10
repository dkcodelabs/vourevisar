import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Target, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Calendar,
  BookOpen,
  X
} from 'lucide-react';

interface CycleStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    totalSubjects: number;
    totalActiveSubjects: number;
    totalCompletedSubjects: number;
    studiedSubjects: number;
    remainingSubjects: number;
    cycleNumber: number;
    cycleStartDate?: string;
  } | null;
}

export const CycleStatsModal: React.FC<CycleStatsModalProps> = ({
  isOpen,
  onClose,
  stats
}) => {
  if (!stats) return null;

  const progressPercentage = stats.totalActiveSubjects > 0 
    ? Math.round((stats.studiedSubjects / stats.totalActiveSubjects) * 100)
    : 0;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não iniciado';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Data inválida';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Estatísticas do Ciclo
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header com Ciclo Atual */}
          <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white rounded-full p-2">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-blue-900">
                    Ciclo #{(stats.cycleNumber || 0) + 1}
                  </h3>
                  <p className="text-blue-600 text-sm">
                    Iniciado em {formatDate(stats.cycleStartDate)}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {progressPercentage}% Completo
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-blue-700">
                <span>Progresso do Ciclo</span>
                <span>{stats.studiedSubjects} de {stats.totalActiveSubjects}</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>
          </div>

          {/* Grid de Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="flex items-center justify-center mb-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalActiveSubjects}
              </div>
              <div className="text-xs text-gray-600">Ativas no Ciclo</div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">
                {stats.studiedSubjects}
              </div>
              <div className="text-xs text-gray-600">Estudadas</div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {stats.remainingSubjects}
              </div>
              <div className="text-xs text-gray-600">Restantes</div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                {stats.totalCompletedSubjects || 0}
              </div>
              <div className="text-xs text-gray-600">100% Concluídas</div>
            </div>
          </div>

          {/* Resumo Detalhado */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Resumo do Ciclo
            </h4>
            
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total de Matérias:</span>
                  <span className="font-medium">{stats.totalSubjects}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Matérias Ativas:</span>
                  <span className="font-medium text-blue-600">{stats.totalActiveSubjects}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Já Estudadas:</span>
                  <span className="font-medium text-green-600">{stats.studiedSubjects}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ainda Restantes:</span>
                  <span className="font-medium text-orange-600">{stats.remainingSubjects}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">100% Concluídas:</span>
                  <span className="font-medium text-emerald-600">{stats.totalCompletedSubjects || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Progresso:</span>
                  <span className="font-medium text-blue-600">{progressPercentage}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mensagem Motivacional */}
          {stats.remainingSubjects > 0 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-blue-800 font-medium">
                🎯 Faltam apenas {stats.remainingSubjects} matéria{stats.remainingSubjects > 1 ? 's' : ''} para completar este ciclo!
              </p>
              <p className="text-blue-600 text-sm mt-1">
                Continue assim, você está indo muito bem!
              </p>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-800 font-medium">
                🎉 Parabéns! Você completou todas as matérias deste ciclo!
              </p>
              <p className="text-green-600 text-sm mt-1">
                Pronto para o próximo desafio!
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};