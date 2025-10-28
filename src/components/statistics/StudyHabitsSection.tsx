import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  Flame, 
  Calendar, 
  Clock, 
  Target,
  TrendingUp,
  Activity
} from 'lucide-react';

interface StudyHabitsSectionProps {
  data: {
    currentStreak: number;
    longestStreak: number;
    mostProductiveDay: string;
    mostProductiveHour: string;
    averageSessionTime: number;
    averageTopicsPerDay: number;
    consistencyRate: number;
  };
}

export const StudyHabitsSection: React.FC<StudyHabitsSectionProps> = ({ data }) => {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Dados simulados para o heatmap semanal
  const weeklyData = [
    { day: 'Dom', sessions: Math.floor(Math.random() * 3) + 1 },
    { day: 'Seg', sessions: Math.floor(Math.random() * 5) + 2 },
    { day: 'Ter', sessions: Math.floor(Math.random() * 5) + 2 },
    { day: 'Qua', sessions: Math.floor(Math.random() * 5) + 2 },
    { day: 'Qui', sessions: Math.floor(Math.random() * 5) + 2 },
    { day: 'Sex', sessions: Math.floor(Math.random() * 5) + 2 },
    { day: 'Sáb', sessions: Math.floor(Math.random() * 4) + 1 },
  ];

  // Dados simulados para horários de estudo
  const hourlyData = [
    { hour: '06:00', intensity: 10 },
    { hour: '08:00', intensity: 25 },
    { hour: '10:00', intensity: 15 },
    { hour: '12:00', intensity: 5 },
    { hour: '14:00', intensity: 30 },
    { hour: '16:00', intensity: 20 },
    { hour: '18:00', intensity: 15 },
    { hour: '20:00', intensity: 45 },
    { hour: '22:00', intensity: 35 },
  ];

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'text-purple-600 bg-purple-50 border-purple-200';
    if (streak >= 14) return 'text-green-600 bg-green-50 border-green-200';
    if (streak >= 7) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-orange-600 bg-orange-50 border-orange-200';
  };

  const getConsistencyColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-blue-600';
    if (rate >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Hábitos e Padrões de Estudo</h2>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className={`border-2 ${getStreakColor(data.currentStreak)}`}>
            <CardContent className="p-6 text-center">
              <Flame className="h-8 w-8 mx-auto mb-3 text-orange-500" />
              <div className="text-3xl font-bold mb-1">{data.currentStreak}</div>
              <p className="text-sm font-medium mb-1">Dias Consecutivos</p>
              <p className="text-xs text-gray-600">
                Recorde: {data.longestStreak} dias
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-3 text-blue-500" />
              <div className="text-3xl font-bold mb-1">{data.mostProductiveDay}</div>
              <p className="text-sm font-medium mb-1">Dia Mais Produtivo</p>
              <p className="text-xs text-gray-600">
                Baseado no histórico
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 mx-auto mb-3 text-purple-500" />
              <div className="text-3xl font-bold mb-1">{data.mostProductiveHour}</div>
              <p className="text-sm font-medium mb-1">Horário Preferido</p>
              <p className="text-xs text-gray-600">
                Pico de produtividade
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6 text-center">
              <Target className={`h-8 w-8 mx-auto mb-3 ${getConsistencyColor(data.consistencyRate)}`} />
              <div className={`text-3xl font-bold mb-1 ${getConsistencyColor(data.consistencyRate)}`}>
                {data.consistencyRate}%
              </div>
              <p className="text-sm font-medium mb-1">Consistência</p>
              <p className="text-xs text-gray-600">
                Últimos 30 dias
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Gráficos de padrões */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Padrão semanal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Padrão Semanal de Estudo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [value, 'Sessões']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sessions" 
                    stroke="#3B82F6" 
                    fill="#3B82F6" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Padrão de horários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              Intensidade por Horário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyData}>
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [value, 'Intensidade']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="intensity" 
                    stroke="#8B5CF6" 
                    strokeWidth={3}
                    dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas detalhadas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Tempo de Sessão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatTime(data.averageSessionTime)}
              </div>
              <p className="text-sm text-gray-600">Tempo médio por sessão</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sessão ideal</span>
                <span className="font-medium">45-90 min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sua média</span>
                <span className="font-medium">{formatTime(data.averageSessionTime)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Produtividade Diária
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data.averageTopicsPerDay}
              </div>
              <p className="text-sm text-gray-600">Tópicos por dia</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Meta recomendada</span>
                <span className="font-medium">5-8 tópicos</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sua média</span>
                <span className="font-medium">{data.averageTopicsPerDay} tópicos</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Análise de Hábitos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Streak atual</span>
                <span className="font-medium">{data.currentStreak} dias</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Melhor streak</span>
                <span className="font-medium">{data.longestStreak} dias</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Consistência</span>
                <span className={`font-medium ${getConsistencyColor(data.consistencyRate)}`}>
                  {data.consistencyRate}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};