
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target, TrendingUp, BookOpen, Calendar, X } from 'lucide-react';

interface StatsSummary {
  totalAttempts: number;
  correctAttempts: number;
  accuracyRate: number;
  streakDays: number;
}

interface StatsSummaryCardsProps {
  stats: StatsSummary;
  isLoading?: boolean;
}

const StatsSummaryCards: React.FC<StatsSummaryCardsProps> = ({ stats, isLoading }) => {
  const incorrectAttempts = stats.totalAttempts - stats.correctAttempts;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="bg-white/70 backdrop-blur-lg border-white/20">
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white/70 backdrop-blur-lg border-white/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-gray-600">Total de Questões</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalAttempts}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/70 backdrop-blur-lg border-white/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-gray-600">Taxa de Acerto</p>
              <p className="text-2xl font-bold text-gray-800">{stats.accuracyRate.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/70 backdrop-blur-lg border-white/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-gray-600">Questões Corretas</p>
              <p className="text-2xl font-bold text-gray-800">{stats.correctAttempts}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/70 backdrop-blur-lg border-white/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <X className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-gray-600">Questões Erradas</p>
              <p className="text-2xl font-bold text-gray-800">{incorrectAttempts}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/70 backdrop-blur-lg border-white/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-orange-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-gray-600">Dias Ativos</p>
              <p className="text-2xl font-bold text-gray-800">{stats.streakDays}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsSummaryCards;
