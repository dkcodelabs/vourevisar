import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';

interface SpacedReviewsSectionProps {
  data: {
    stage24h: number;
    stage7d: number;
    stage15d: number;
    stage30d: number;
    stage60d: number;
    stage90d: number;
    completedOnTime: number;
    completedLate: number;
    onTimePercentage: number;
  };
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const SpacedReviewsSection: React.FC<SpacedReviewsSectionProps> = ({ data }) => {
  const stageData = [
    { name: '24h', value: data.stage24h, color: '#EF4444' },
    { name: '7d', value: data.stage7d, color: '#F59E0B' },
    { name: '15d', value: data.stage15d, color: '#10B981' },
    { name: '30d', value: data.stage30d, color: '#3B82F6' },
    { name: '60d', value: data.stage60d, color: '#8B5CF6' },
    { name: '90d', value: data.stage90d, color: '#6B7280' },
  ];

  const completionData = [
    { name: 'No Prazo', value: data.completedOnTime, color: '#10B981' },
    { name: 'Atrasadas', value: data.completedLate, color: '#EF4444' },
  ];

  const totalReviews = data.completedOnTime + data.completedLate;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Revisões Espaçadas</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estatísticas principais */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Taxa de Sucesso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-3">
                <div className="text-4xl font-bold text-green-600">
                  {data.onTimePercentage}%
                </div>
                <p className="text-sm text-gray-600">
                  Revisões concluídas no prazo
                </p>
                <Progress value={data.onTimePercentage} className="h-3" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Total de Revisões
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Concluídas no prazo</span>
                <span className="font-semibold text-green-600">{data.completedOnTime}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Concluídas com atraso</span>
                <span className="font-semibold text-orange-600">{data.completedLate}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-sm font-medium text-gray-900">Total</span>
                <span className="font-bold text-gray-900">{totalReviews}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de barras por estágio */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5 text-blue-600" />
              Revisões por Estágio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [value, 'Revisões']}
                    labelFormatter={(label) => `Estágio: ${label}`}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards dos estágios */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stageData.map((stage, index) => (
          <motion.div
            key={stage.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="text-center hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-4">
                <div 
                  className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: stage.color }}
                >
                  {stage.name}
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {stage.value}
                </div>
                <p className="text-xs text-gray-600">
                  {stage.name === '24h' ? 'Primeira revisão' :
                   stage.name === '7d' ? 'Segunda revisão' :
                   stage.name === '15d' ? 'Terceira revisão' :
                   stage.name === '30d' ? 'Quarta revisão' :
                   stage.name === '60d' ? 'Quinta revisão' :
                   'Revisão final'}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Análise de pontualidade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Análise de Pontualidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Distribuição de Conclusões</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-600">No prazo</span>
                  </div>
                  <span className="font-semibold">{data.completedOnTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm text-gray-600">Com atraso</span>
                  </div>
                  <span className="font-semibold">{data.completedLate}</span>
                </div>
              </div>
            </div>

            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={completionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {completionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};