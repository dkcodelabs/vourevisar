import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { 
  Award, 
  BookOpen, 
  Clock, 
  TrendingUp,
  Medal,
  Target
} from 'lucide-react';

interface SubjectPerformanceData {
  id: string;
  name: string;
  totalTopics: number;
  completedTopics: number;
  completionPercentage: number;
  studyTime: number;
  difficultyPoints?: number;
  averageDifficulty?: number;
  rank: number;
}

interface SubjectPerformanceSectionProps {
  data: SubjectPerformanceData[];
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'];

export const SubjectPerformanceSection: React.FC<SubjectPerformanceSectionProps> = ({ data }) => {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Medal className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <Target className="h-5 w-5 text-gray-400" />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200';
      case 2:
        return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200';
      case 3:
        return 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200';
      default:
        return 'bg-card border-border';
    }
  };

  // Dados para o gráfico de pizza (top 6 matérias)
  const pieData = data.slice(0, 6).map((subject, index) => ({
    name: subject.name,
    value: subject.completedTopics,
    color: COLORS[index % COLORS.length],
  }));

  // Dados para o gráfico de barras
  const barData = data.map(subject => ({
    name: subject.name.length > 15 ? subject.name.substring(0, 15) + '...' : subject.name,
    completedTopics: subject.completedTopics,
    totalTopics: subject.totalTopics,
    completionPercentage: subject.completionPercentage,
  }));

  const bestPerformer = data[0];
  const worstPerformer = data[data.length - 1];
  const totalStudyTime = data.reduce((sum, subject) => sum + subject.studyTime, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Award className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Desempenho por Disciplina</h2>
      </div>

      {/* Estatísticas principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">Melhor Desempenho</p>
                <p className="text-2xl font-bold text-foreground">
                  {bestPerformer?.name || 'N/A'}
                </p>
                <p className="text-sm text-emerald-600">
                  {bestPerformer?.completionPercentage || 0}% concluído
                </p>
              </div>
              <Medal className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-content-muted">Tempo Total</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatTime(totalStudyTime)}
                </p>
                <p className="text-sm text-content-muted">
                  Todas as disciplinas
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Precisa de Atenção</p>
                <p className="text-2xl font-bold text-foreground">
                  {worstPerformer?.name || 'N/A'}
                </p>
                <p className="text-sm text-orange-600">
                  {worstPerformer?.completionPercentage || 0}% concluído
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Pizza - Distribuição de Tópicos Concluídos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Distribuição de Tópicos Concluídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, 'Tópicos']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Barras - Progresso por Matéria */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Progresso por Matéria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      value, 
                      name === 'completedTopics' ? 'Concluídos' : 'Total'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="completedTopics" fill="#10B981" name="Concluídos" />
                  <Bar dataKey="totalTopics" fill="#E5E7EB" name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking detalhado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-blue-600" />
            Ranking das Disciplinas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.map((subject, index) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`p-4 rounded-lg border ${getRankColor(subject.rank)} hover:shadow-md transition-shadow duration-300`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getRankIcon(subject.rank)}
                    <div>
                      <h4 className="font-semibold text-gray-900">{subject.name}</h4>
                      <p className="text-sm text-gray-600">
                        {subject.completedTopics} de {subject.totalTopics} tópicos • {formatTime(subject.studyTime)}
                      </p>
                      {subject.difficultyPoints && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {subject.difficultyPoints} pontos
                          </span>
                          {subject.averageDifficulty && (
                            <span className="text-xs text-gray-500">
                              {'⭐'.repeat(Math.round(subject.averageDifficulty))} média
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {subject.completionPercentage}%
                    </div>
                    <div className="text-sm text-gray-500">#{subject.rank}</div>
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={subject.completionPercentage} className="h-2" />
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};