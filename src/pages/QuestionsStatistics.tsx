
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InlineProgress } from '@/components/ui/inline-progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface QuestionsStatisticsProps {
  hideHeader?: boolean;
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
}

const QuestionsStatistics: React.FC<QuestionsStatisticsProps> = ({
  hideHeader = false,
  selectedPeriod: externalSelectedPeriod,
  onPeriodChange: externalOnPeriodChange
}) => {
  const { user } = useAuth();
  const [internalSelectedPeriod, setInternalSelectedPeriod] = useState('30');
  
  // Use external period if provided, otherwise use internal
  const selectedPeriod = externalSelectedPeriod || internalSelectedPeriod;
  const onPeriodChange = externalOnPeriodChange || setInternalSelectedPeriod;

  const [stats, setStats] = useState({
    totalAttempts: 0,
    correctAttempts: 0,
    accuracyRate: 0,
    averagePerDay: 0,
    bestSubject: '',
    worstSubject: ''
  });

  const [chartData, setChartData] = useState({
    dailyProgress: [],
    subjectPerformance: [],
    difficultyBreakdown: [],
    bankComparison: []
  });

  const [detailedStats, setDetailedStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Função para validar e limpar dados do gráfico
  const cleanChartData = (data: any[]) => {
    return data.map(item => {
      const cleanItem = { ...item };
      Object.keys(cleanItem).forEach(key => {
        if (typeof cleanItem[key] === 'number' && (isNaN(cleanItem[key]) || !isFinite(cleanItem[key]))) {
          cleanItem[key] = 0;
        }
      });
      return cleanItem;
    }).filter(item => Object.keys(item).length > 0);
  };

  // Função para calcular porcentagem segura
  const safePercentage = (numerator: number, denominator: number): number => {
    if (!denominator || denominator === 0 || isNaN(numerator) || isNaN(denominator)) {
      return 0;
    }
    const result = (numerator / denominator) * 100;
    return isNaN(result) || !isFinite(result) ? 0 : Math.round(result * 10) / 10;
  };

  useEffect(() => {
    if (user) {
      fetchStatistics();
    }
  }, [user, selectedPeriod]);

  const fetchStatistics = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const daysAgo = parseInt(selectedPeriod);
      const fromDate = startOfDay(subDays(new Date(), daysAgo));

      const { data, error } = await supabase
        .from('question_attempts')
        .select('*')
        .eq('user_id', user.id)
        .gte('attempted_at', fromDate.toISOString());

      if (error) throw error;

      const attempts = data || [];
      processStatistics(attempts);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processStatistics = (attempts: any[]) => {
    const total = attempts.length;
    const correct = attempts.filter(a => a.is_correct).length;
    const accuracy = safePercentage(correct, total);

    const uniqueDays = new Set(
      attempts.map(a => format(new Date(a.attempted_at), 'yyyy-MM-dd'))
    );
    const avgPerDay = safePercentage(total, uniqueDays.size);

    // Estatísticas por matéria com validação
    const subjectStats = attempts.reduce((acc, attempt) => {
      const subject = attempt.subject || 'Desconhecido';
      if (!acc[subject]) {
        acc[subject] = { total: 0, correct: 0 };
      }
      acc[subject].total++;
      if (attempt.is_correct) {
        acc[subject].correct++;
      }
      return acc;
    }, {});

    const subjectPerformanceData = Object.entries(subjectStats).map(([subject, stats]: [string, any]) => ({
      subject,
      accuracy: safePercentage(stats.correct, stats.total),
      total: stats.total || 0,
      correct: stats.correct || 0
    })).filter(item => item.total > 0);

    // Progresso diário com validação
    const dailyStats = attempts.reduce((acc, attempt) => {
      const date = format(new Date(attempt.attempted_at), 'dd/MM');
      if (!acc[date]) {
        acc[date] = { total: 0, correct: 0 };
      }
      acc[date].total++;
      if (attempt.is_correct) {
        acc[date].correct++;
      }
      return acc;
    }, {});

    const dailyProgressData = Object.entries(dailyStats).map(([date, stats]: [string, any]) => ({
      date,
      accuracy: safePercentage(stats.correct, stats.total),
      total: stats.total || 0
    })).filter(item => item.total > 0);

    // Breakdown por dificuldade com validação
    const difficultyStats = attempts.reduce((acc, attempt) => {
      const difficulty = attempt.difficulty || 'medio';
      if (!acc[difficulty]) {
        acc[difficulty] = { total: 0, correct: 0 };
      }
      acc[difficulty].total++;
      if (attempt.is_correct) {
        acc[difficulty].correct++;
      }
      return acc;
    }, {});

    const difficultyBreakdownData = Object.entries(difficultyStats).map(([difficulty, stats]: [string, any]) => ({
      difficulty: difficulty === 'facil' ? 'Fácil' : difficulty === 'medio' ? 'Médio' : 'Difícil',
      value: stats.total || 0,
      accuracy: safePercentage(stats.correct, stats.total)
    })).filter(item => item.value > 0);

    // Comparação por banca com validação
    const bankStats = attempts.reduce((acc, attempt) => {
      const bank = attempt.bank || 'Desconhecido';
      if (!acc[bank]) {
        acc[bank] = { total: 0, correct: 0 };
      }
      acc[bank].total++;
      if (attempt.is_correct) {
        acc[bank].correct++;
      }
      return acc;
    }, {});

    const bankComparisonData = Object.entries(bankStats).map(([bank, stats]: [string, any]) => ({
      bank,
      accuracy: safePercentage(stats.correct, stats.total),
      total: stats.total || 0
    })).filter(item => item.total > 0);

    // Estatísticas detalhadas por matéria e tópico
    const detailedStatsData = attempts.reduce((acc, attempt) => {
      const key = `${attempt.subject || 'Desconhecido'}-${attempt.topic || 'Desconhecido'}`;
      if (!acc[key]) {
        acc[key] = {
          subject: attempt.subject || 'Desconhecido',
          topic: attempt.topic || 'Desconhecido',
          total: 0,
          correct: 0
        };
      }
      acc[key].total++;
      if (attempt.is_correct) {
        acc[key].correct++;
      }
      return acc;
    }, {});

    const detailedList = Object.values(detailedStatsData).filter((item: any) => item.total > 0);

    // Encontrar melhor e pior matéria
    const sortedSubjects = subjectPerformanceData.sort((a, b) => b.accuracy - a.accuracy);
    const bestSubject = sortedSubjects[0]?.subject || '';
    const worstSubject = sortedSubjects[sortedSubjects.length - 1]?.subject || '';

    setStats({
      totalAttempts: total,
      correctAttempts: correct,
      accuracyRate: accuracy,
      averagePerDay: avgPerDay,
      bestSubject,
      worstSubject
    });

    setChartData({
      dailyProgress: cleanChartData(dailyProgressData),
      subjectPerformance: cleanChartData(subjectPerformanceData),
      difficultyBreakdown: cleanChartData(difficultyBreakdownData),
      bankComparison: cleanChartData(bankComparisonData)
    });

    setDetailedStats(detailedList);
  };

  const chartConfig = {
    accuracy: {
      label: "Taxa de Acerto",
      color: "hsl(var(--chart-1))",
    },
    total: {
      label: "Total de Questões",
      color: "hsl(var(--chart-2))",
    },
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-white/70 backdrop-blur-lg border-white/20">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-64 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="container mx-auto p-6 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {!hideHeader && (
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Estatísticas de Questões</h1>
          <p className="text-gray-600">Análise detalhada do seu desempenho</p>
        </div>
      )}

      {!hideHeader && (
        <div className="flex justify-center mb-6">
          <Select value={selectedPeriod} onValueChange={onPeriodChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="365">1 ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white/70 backdrop-blur-lg border-white/20">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.totalAttempts}</p>
              <p className="text-sm text-gray-600">Total de Questões</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-lg border-white/20">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.accuracyRate.toFixed(1)}%</p>
              <p className="text-sm text-gray-600">Taxa de Acerto</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-lg border-white/20">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.averagePerDay.toFixed(1)}</p>
              <p className="text-sm text-gray-600">Questões/Dia</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-lg border-white/20">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.correctAttempts}</p>
              <p className="text-sm text-gray-600">Questões Corretas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progresso Diário */}
      {chartData.dailyProgress.length > 0 && (
        <Card className="bg-white/70 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle>Progresso Diário</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.dailyProgress}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="accuracy" 
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--chart-1))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Desempenho por Matéria */}
      {chartData.subjectPerformance.length > 0 && (
        <Card className="bg-white/70 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle>Desempenho por Matéria</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.subjectPerformance} layout="horizontal">
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="subject" type="category" width={120} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="accuracy" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Detalhamento por Matéria */}
      {detailedStats.length > 0 && (
        <Card className="bg-white/70 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle>Detalhamento por Matéria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {detailedStats.map((item: any, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{item.subject}</div>
                    <div className="text-sm text-gray-600">{item.topic}</div>
                  </div>
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="flex-1 min-w-0">
                      <InlineProgress 
                        correct={item.correct || 0} 
                        total={item.total || 0} 
                        className="w-full"
                      />
                    </div>
                    <div className="text-sm text-gray-600 text-right whitespace-nowrap">
                      {item.correct || 0}/{item.total || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparação por Banca */}
      {chartData.bankComparison.length > 0 && (
        <Card className="bg-white/70 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle>Comparação por Banca</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.bankComparison} layout="horizontal">
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="bank" type="category" width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="accuracy" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Breakdown por Dificuldade */}
      {chartData.difficultyBreakdown.length > 0 && (
        <Card className="bg-white/70 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle>Distribuição por Dificuldade</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.difficultyBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ difficulty, value }) => `${difficulty}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.difficultyBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 3) + 1}))`} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

export default QuestionsStatistics;
