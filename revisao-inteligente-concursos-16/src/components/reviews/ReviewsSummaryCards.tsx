
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle } from 'lucide-react';

interface ReviewsSummaryCardsProps {
  delayedCount: number;
  todayCount: number;
  futureCount: number;
  completedCount: number;
}

export const ReviewsSummaryCards: React.FC<ReviewsSummaryCardsProps> = ({
  delayedCount,
  todayCount,
  futureCount,
  completedCount
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <Card className="bg-white border border-red-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-red-600">Revisões Atrasadas</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{delayedCount}</div>
        </CardContent>
      </Card>
      
      <Card className="bg-white border border-orange-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-orange-600">Revisões do Dia</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{todayCount}</div>
        </CardContent>
      </Card>
      
      <Card className="bg-white border border-blue-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-blue-600">Revisões Futuras</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{futureCount}</div>
        </CardContent>
      </Card>
      
      <Card className="bg-white border border-green-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-green-600">Tópicos Concluídos</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{completedCount}</div>
        </CardContent>
      </Card>
    </div>
  );
};
