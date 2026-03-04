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
  Star,
  Trophy,
  Target,
  Zap,
  Award
} from 'lucide-react';

interface DifficultyStatsSectionProps {
  data: {
    totalTopics: number;
    ratedTopics: number;
    completedTopics: number;
    completedRatedTopics: number;
    averageDifficulty: number;
    averageCompletedDifficulty: number;
    difficultyDistribution: { [key: string]: number };
    completedDistribution: { [key: string]: number };
    totalPoints: number;
    completedPoints: number;
    estimatedTime: number;
    completedTime: number;
    efficiencyByDifficulty: Array<{
      level: number;
      total: number;
      completed: number;
      efficiency: number;
    }>;
    ratingProgress: number;
    completionProgress: number;
    hardestCompletedTopic: {
      name: string;
      difficulty: number;
      subject: string;
    } | null;
    easiestPendingTopics: Array<{
      name: string;
      difficulty: number;
      subject: string;
    }>;
  };
}

const DIFFICULTY_COLORS = {
  '1': '#10B981', // Verde
  '2': '#F59E0B', // Amarelo
  '3': '#EF4444', // Vermelho
  '4': '#F97316', // Laranja - Fallback
  '5': '#EF4444', // Vermelho - Fallback
  'unrated': '#9CA3AF' // Cinza - Não avaliado
};

const DIFFICULTY_LABELS = {
  '1': 'Fácil',
  '2': 'Médio',
  '3': 'Difícil',
  '4': 'Difícil',
  '5': 'Muito Difícil',
  'unrated': 'Não Avaliado'
};

export const DifficultyStatsSection: React.FC<DifficultyStatsSectionProps> = ({ data }) => {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Preparar dados para gráficos
  const chartData = Object.entries(data.difficultyDistribution).map(([level, count]) => ({
    level: level === 'unrated' ? 'Não Avaliado' : `${level} ⭐`,
    count,
    color: DIFFICULTY_COLORS[level as keyof typeof DIFFICULTY_COLORS],
    percentage: Math.round((count / data.totalTopics) * 100)
  }));

  const ratingPercentage = data.totalTopics > 0 ? Math.round((data.ratedTopics / data.totalTopics) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Star className="h-6 w-6 text-yellow-500" />
        <h2 className="text-2xl font-bold text-gray-900">Análise de Dificuldade</h2>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
            <CardContent className="p-6 text-center">
              <Star className="h-8 w-8 mx-auto mb-3 text-yellow-500" />
              <div className="text-3xl font-bold mb-1 text-yellow-700">
                {data.averageDifficulty.toFixed(1)}
              </div>
              <p className="text-sm font-medium mb-1 text-yellow-800">Dificuldade Média</p>
              <p className="text-xs text-yellow-600">
                {'⭐'.repeat(Math.round(data.averageDifficulty))}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-3 text-blue-500" />
              <div className="text-3xl font-bold mb-1 text-blue-700">
                {data.completedPoints}
              </div>
              <p className="text-sm font-medium mb-1 text-blue-800">Pontos Conquistados</p>
              <p className="text-xs text-blue-600">
                de {data.totalPoints} possíveis
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-6 text-center">
              <Target className="h-8 w-8 mx-auto mb-3 text-green-500" />
              <div className="text-3xl font-bold mb-1 text-green-700">
                {data.ratingProgress}%
              </div>
              <p className="text-sm font-medium mb-1 text-green-800">Tópicos Avaliados</p>
              <p className="text-xs text-green-600">
                {data.ratedTopics} de {data.totalTopics}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-6 text-center">
              <Zap className="h-8 w-8 mx-auto mb-3 text-purple-500" />
              <div className="text-3xl font-bold mb-1 text-purple-700">
                {formatTime(data.completedTime)}
              </div>
              <p className="text-sm font-medium mb-1 text-purple-800">Tempo Estudado</p>
              <p className="text-xs text-purple-600">
                de {formatTime(data.estimatedTime)} total
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="bg-gradient-to-r from-rose-50 to-red-50 border-rose-200">
            <CardContent className="p-6 text-center">
              <Award className="h-8 w-8 mx-auto mb-3 text-rose-500" />
              <div className="text-3xl font-bold mb-1 text-rose-700">
                {data.averageCompletedDifficulty > 0 ? data.averageCompletedDifficulty.toFixed(1) : '0.0'}
              </div>
              <p className="text-sm font-medium mb-1 text-rose-800">Dificuldade Concluída</p>
              <p className="text-xs text-rose-600">
                {data.averageCompletedDifficulty > 0 ? '⭐'.repeat(Math.round(data.averageCompletedDifficulty)) : 'Nenhuma'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Eficiência por Dificuldade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Eficiência por Nível de Dificuldade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.efficiencyByDifficulty.map((item, index) => (
              <motion.div
                key={item.level}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {'⭐'.repeat(item.level)}
                  </div>
                  <span className="font-medium">
                    Nível {item.level} - {DIFFICULTY_LABELS[item.level.toString() as keyof typeof DIFFICULTY_LABELS]}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {item.completed}/{item.total} ({item.efficiency}%)
                  </span>
                  <div className="w-24">
                    <Progress value={item.efficiency} className="h-2" />
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${item.efficiency >= 80 ? 'bg-green-100 text-green-800' :
                      item.efficiency >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                    }`}>
                    {item.efficiency >= 80 ? 'Excelente' :
                      item.efficiency >= 60 ? 'Bom' : 'Precisa melhorar'}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por dificuldade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5 text-blue-600" />
              Distribuição por Dificuldade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="level" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [value, 'Tópicos']}
                    labelFormatter={(label) => label}
                  />
                  <Bar
                    dataKey="count"
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pizza da distribuição */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              Proporção de Dificuldades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ level, percentage }) => `${level}: ${percentage}%`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, 'Tópicos']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento por nível */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-600" />
            Detalhamento por Nível
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {chartData.map((item, index) => (
              <motion.div
                key={item.level}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium">{item.level}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {item.count} tópicos ({item.percentage}%)
                  </span>
                  <div className="w-24">
                    <Progress value={item.percentage} className="h-2" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conquistas e Próximos Passos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conquistas */}
        <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Trophy className="h-5 w-5" />
              🏆 Suas Conquistas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.hardestCompletedTopic && (
                <div className="p-3 bg-amber-100 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-amber-800">Tópico Mais Difícil Dominado</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    <strong>{data.hardestCompletedTopic.name}</strong>
                    {' '}({'⭐'.repeat(data.hardestCompletedTopic.difficulty)})
                  </p>
                  <p className="text-xs text-amber-600">
                    {data.hardestCompletedTopic.subject}
                  </p>
                </div>
              )}

              <div className="p-3 bg-amber-100 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-800">Pontos Conquistados</span>
                </div>
                <p className="text-sm text-amber-700">
                  <strong>{data.completedPoints}</strong> de {data.totalPoints} pontos possíveis
                </p>
                <div className="mt-2">
                  <Progress
                    value={data.totalPoints > 0 ? (data.completedPoints / data.totalPoints) * 100 : 0}
                    className="h-2"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-100 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-800">Tempo de Estudo</span>
                </div>
                <p className="text-sm text-amber-700">
                  <strong>{formatTime(data.completedTime)}</strong> estudados
                </p>
                <p className="text-xs text-amber-600">
                  {data.estimatedTime > 0 ? Math.round((data.completedTime / data.estimatedTime) * 100) : 0}% do tempo total estimado
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Próximos Passos */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Target className="h-5 w-5" />
              🎯 Próximos Passos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.ratingProgress < 100 && (
                <div className="p-3 bg-green-100 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Avalie Mais Tópicos</span>
                  </div>
                  <p className="text-sm text-green-700">
                    {data.totalTopics - data.ratedTopics} tópicos ainda não foram avaliados
                  </p>
                  <p className="text-xs text-green-600">
                    Avalie para ter estatísticas mais precisas
                  </p>
                </div>
              )}

              {data.easiestPendingTopics.length > 0 && (
                <div className="p-3 bg-green-100 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Vitórias Rápidas</span>
                  </div>
                  <div className="space-y-1">
                    {data.easiestPendingTopics.slice(0, 3).map((topic, index) => (
                      <div key={index} className="text-sm text-green-700">
                        • <strong>{topic.name}</strong>
                        {topic.difficulty > 0 && (
                          <span className="ml-1">
                            ({'⭐'.repeat(topic.difficulty)})
                          </span>
                        )}
                        <span className="text-xs text-green-600 ml-1">
                          - {topic.subject}
                        </span>
                      </div>
                    ))}
                    {data.easiestPendingTopics.length > 3 && (
                      <p className="text-xs text-green-600">
                        +{data.easiestPendingTopics.length - 3} outros tópicos fáceis
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="p-3 bg-green-100 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Meta de Pontos</span>
                </div>
                <p className="text-sm text-green-700">
                  Faltam <strong>{data.totalPoints - data.completedPoints}</strong> pontos para completar tudo
                </p>
                <div className="mt-2">
                  <Progress
                    value={data.totalPoints > 0 ? (data.completedPoints / data.totalPoints) * 100 : 0}
                    className="h-2"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights sobre dificuldade */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-indigo-500 flex-shrink-0">
              <Star className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-indigo-900 mb-2">
                💡 Insights Inteligentes
              </h3>
              <div className="space-y-2 text-indigo-800">
                <p>
                  • Sua dificuldade média é <strong>{data.averageDifficulty.toFixed(1)} estrelas</strong> -
                  {data.averageDifficulty >= 4 ? ' você gosta de desafios!' :
                    data.averageDifficulty >= 3 ? ' um bom equilíbrio!' :
                      ' foque em consolidar o básico!'}
                </p>
                {data.averageCompletedDifficulty > 0 && (
                  <p>
                    • Você dominou tópicos com dificuldade média de <strong>{data.averageCompletedDifficulty.toFixed(1)} estrelas</strong>
                  </p>
                )}
                <p>
                  • Você conquistou <strong>{data.completedPoints}</strong> de {data.totalPoints} pontos possíveis
                  ({data.totalPoints > 0 ? Math.round((data.completedPoints / data.totalPoints) * 100) : 0}%)
                </p>
                <p>
                  • Tempo estudado: <strong>{formatTime(data.completedTime)}</strong> de {formatTime(data.estimatedTime)} estimado
                </p>
                {data.ratingProgress < 50 && (
                  <p className="text-orange-700">
                    • Avalie mais tópicos para ter estatísticas mais precisas ({data.ratingProgress}% avaliados)
                  </p>
                )}
                {data.easiestPendingTopics.length > 0 && (
                  <p className="text-green-700">
                    • {data.easiestPendingTopics.length} tópicos fáceis esperando por você - vitórias rápidas!
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};