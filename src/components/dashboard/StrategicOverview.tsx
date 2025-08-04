import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, TrendingUp, Eye, Target, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StrategicOverviewProps {
  overdueCount: number;
  todayCount: number;
  progressPercentage: number;
  completedTopics: number;
  totalTopics: number;
}

export const StrategicOverview: React.FC<StrategicOverviewProps> = ({
  overdueCount,
  todayCount,
  progressPercentage,
  completedTopics,
  totalTopics
}) => {
  const navigate = useNavigate();

  const getRecommendation = () => {
    if (overdueCount > 10) {
      return "🚨 Situação crítica: Foque primeiro nos tópicos atrasados para recuperar o ritmo";
    } else if (overdueCount > 5) {
      return "⚠️ Atenção: Priorize os tópicos atrasados antes de continuar com novos estudos";
    } else if (todayCount > 8) {
      return "📚 Dia intenso: Considere dividir as revisões ao longo do dia";
    } else if (overdueCount === 0 && todayCount === 0) {
      return "🎉 Excelente! Você está em dia com todas as revisões";
    } else {
      return "👍 Bom ritmo: Continue mantendo a consistência nos estudos";
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Situação Atual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Atrasados */}
          <div className={`p-4 rounded-lg border-2 text-center ${
            overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className={`h-6 w-6 ${
                overdueCount > 0 ? 'text-red-500' : 'text-gray-400'
              }`} />
            </div>
            <div className={`text-3xl font-bold ${
              overdueCount > 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {overdueCount}
            </div>
            <div className="text-sm text-gray-600 mb-3">
              {overdueCount === 1 ? 'tópico atrasado' : 'tópicos atrasados'}
            </div>
            <Button 
              variant={overdueCount > 0 ? "destructive" : "outline"}
              size="sm"
              onClick={() => navigate('/revisoes')}
              disabled={overdueCount === 0}
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver Detalhes
            </Button>
          </div>

          {/* Hoje */}
          <div className={`p-4 rounded-lg border-2 text-center ${
            todayCount > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-center mb-2">
              <Calendar className={`h-6 w-6 ${
                todayCount > 0 ? 'text-yellow-500' : 'text-gray-400'
              }`} />
            </div>
            <div className={`text-3xl font-bold ${
              todayCount > 0 ? 'text-yellow-600' : 'text-gray-600'
            }`}>
              {todayCount}
            </div>
            <div className="text-sm text-gray-600 mb-3">
              {todayCount === 1 ? 'tópico para hoje' : 'tópicos para hoje'}
            </div>
            <Button 
              variant={todayCount > 0 ? "default" : "outline"}
              size="sm"
              onClick={() => navigate('/revisoes')}
              disabled={todayCount === 0}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Ver Agenda
            </Button>
          </div>

          {/* Progresso */}
          <div className="p-4 rounded-lg border-2 bg-blue-50 border-blue-200 text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-6 w-6 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {progressPercentage}%
            </div>
            <div className="text-sm text-gray-600 mb-3">
              ({completedTopics}/{totalTopics})
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => navigate('/estatisticas')}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Ver Stats
            </Button>
          </div>
        </div>

        {/* Recomendação */}
        <div className={`p-4 rounded-lg ${
          overdueCount > 10 ? 'bg-red-50 border border-red-200' :
          overdueCount > 5 ? 'bg-orange-50 border border-orange-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              💡
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">Recomendação:</p>
              <p className="text-gray-700 text-sm">{getRecommendation()}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};