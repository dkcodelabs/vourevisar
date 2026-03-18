import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Award,
  Calendar,
  Activity
} from 'lucide-react';

interface EvolutionSectionProps {
  data: {
    weeklyComparison: number;
    monthlyProgress: Array<{
      week: string;
      completed: number;
      reviewed: number;
    }>;
    consistencyScore: number;
    goalsAchieved: number;
  };
}

export const EvolutionSection: React.FC<EvolutionSectionProps> = ({ data }) => {
  const getTrendIcon = (value: number) => {
    if (value > 0) {
      return <TrendingUp className="h-5 w-5 text-green-600" />;
    } else if (value < 0) {
      return <TrendingDown className="h-5 w-5 text-red-600" />;
    }
    return <Activity className="h-5 w-5 text-gray-600" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600 bg-green-50 border-green-200';
    if (value < 0) return 'text-red-600 bg-red-50 border-red-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getConsistencyLevel = (score: number) => {
    if (score >= 90) return { label: 'Excelente', color: 'text-green-600' };
    if (score >= 70) return { label: 'Boa', color: 'text-blue-600' };
    if (score >= 50) return { label: 'Regular', color: 'text-orange-600' };
    return { label: 'Precisa Melhorar', color: 'text-red-600' };
  };

  // Dados simulados para evolução diária das últimas 2 semanas
  const dailyEvolution = Array.from({ length: 14 }, (_, i) => ({
    day: `Dia ${i + 1}`,
    topicos: Math.floor(Math.random() * 8) + 2,
    tempo: Math.floor(Math.random() * 120) + 30,
  }));

  const consistencyLevel = getConsistencyLevel(data.consistencyScore);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Consistência e Evolução</h2>
      </div>

      {/* Cards de métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className={`border-2 ${data.weeklyComparison >= 0 ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600' : 'bg-rose-500/5 border-rose-500/20 text-rose-600'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-content-muted">Comparação Semanal</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getTrendIcon(data.weeklyComparison)}
                    <span className="text-2xl font-bold text-foreground">
                      {data.weeklyComparison > 0 ? '+' : ''}{data.weeklyComparison}%
                    </span>
                  </div>
                  <p className="text-xs text-content-muted mt-1">
                    vs. semana anterior
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Score de Consistência</p>
                  <div className="text-2xl font-bold mt-1 mb-1">
                    {data.consistencyScore}%
                  </div>
                  <p className={`text-xs font-medium ${consistencyLevel.color}`}>
                    {consistencyLevel.label}
                  </p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
              <Progress value={data.consistencyScore} className="mt-3 h-2" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-content-muted">Metas Atingidas</p>
                  <div className="text-2xl font-bold mt-1 mb-1 text-foreground">
                    {data.goalsAchieved}
                  </div>
                  <p className="text-xs text-content-muted">
                    Este mês
                  </p>
                </div>
                <Award className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Progresso Mensal</p>
                  <div className="text-2xl font-bold mt-1 mb-1">
                    {data.monthlyProgress.reduce((sum, week) => sum + week.completed, 0)}
                  </div>
                  <p className="text-xs text-gray-500">
                    Tópicos concluídos
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Gráficos de evolução */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progresso mensal por semana */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5 text-blue-600" />
              Progresso Mensal por Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyProgress}>
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completed" fill="#10B981" name="Concluídos" />
                  <Bar dataKey="reviewed" fill="#3B82F6" name="Revisados" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Evolução diária */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              Evolução Diária (Últimas 2 Semanas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyEvolution}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      value, 
                      name === 'topicos' ? 'Tópicos' : 'Tempo (min)'
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="topicos" 
                    stroke="#8B5CF6" 
                    fill="#8B5CF6" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Análise detalhada */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Análise de tendências */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Análise de Tendências
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-secondary/50 border border-border rounded-lg">
                <span className="text-sm font-medium">Progresso semanal</span>
                <div className="flex items-center gap-2">
                  {getTrendIcon(data.weeklyComparison)}
                  <span className={`font-bold ${data.weeklyComparison > 0 ? 'text-emerald-600' : data.weeklyComparison < 0 ? 'text-rose-600' : 'text-foreground'}`}>
                    {data.weeklyComparison > 0 ? '+' : ''}{data.weeklyComparison}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Consistência</span>
                <div className="flex items-center gap-2">
                  <Target className={`h-4 w-4 ${consistencyLevel.color}`} />
                  <span className={`font-bold ${consistencyLevel.color}`}>
                    {consistencyLevel.label}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Metas do mês</span>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-500" />
                  <span className="font-bold text-gray-900">
                    {data.goalsAchieved}/5 atingidas
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo do progresso */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Resumo do Progresso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {data.monthlyProgress.map((week, index) => (
                <div key={week.week} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">{week.week}</span>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600">
                        {week.completed} concluídos
                      </div>
                      <div className="text-xs text-blue-600">
                        {week.reviewed} revisados
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">Total do Mês</span>
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    {data.monthlyProgress.reduce((sum, week) => sum + week.completed, 0)} concluídos
                  </div>
                  <div className="text-sm text-blue-600">
                    {data.monthlyProgress.reduce((sum, week) => sum + week.reviewed, 0)} revisados
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};