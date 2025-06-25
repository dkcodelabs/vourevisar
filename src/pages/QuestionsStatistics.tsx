
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { InlineProgress } from '@/components/ui/inline-progress';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Question {
  id: string;
  subject: string;
  topic: string;
  bank: string;
  question_type: string;
  is_correct: boolean;
  attempted_at: string;
}

interface StatsSummary {
  totalAttempts: number;
  correctAttempts: number;
  accuracyRate: number;
  streakDays: number;
}

interface SubjectStats {
  subject: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface QuestionsStatisticsProps {
  hideHeader?: boolean;
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
}

const QuestionsStatistics: React.FC<QuestionsStatisticsProps> = ({ 
  hideHeader = false, 
  selectedPeriod = '30',
  onPeriodChange 
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<Question[]>([]);
  const [stats, setStats] = useState<StatsSummary>({
    totalAttempts: 0,
    correctAttempts: 0,
    accuracyRate: 0,
    streakDays: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAttempts();
    }
  }, [user, selectedPeriod]);

  const fetchAttempts = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const daysAgo = parseInt(selectedPeriod);
      const fromDate = startOfDay(subDays(new Date(), daysAgo));

      const { data, error } = await supabase
        .from('question_attempts')
        .select('*')
        .eq('user_id', user.id)
        .gte('attempted_at', fromDate.toISOString())
        .order('attempted_at', { ascending: false });

      if (error) throw error;

      setAttempts(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Erro ao buscar tentativas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (attemptsData: Question[]) => {
    const total = attemptsData.length;
    const correct = attemptsData.filter(a => a.is_correct).length;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;

    setStats({
      totalAttempts: total,
      correctAttempts: correct,
      accuracyRate: accuracy,
      streakDays: calculateStreak(attemptsData)
    });
  };

  const calculateStreak = (attemptsData: Question[]) => {
    const uniqueDays = new Set(
      attemptsData.map(a => format(new Date(a.attempted_at), 'yyyy-MM-dd'))
    );
    return uniqueDays.size;
  };

  const getSubjectStats = (): SubjectStats[] => {
    const subjectMap = new Map<string, { total: number; correct: number }>();

    attempts.forEach(attempt => {
      const current = subjectMap.get(attempt.subject) || { total: 0, correct: 0 };
      subjectMap.set(attempt.subject, {
        total: current.total + 1,
        correct: current.correct + (attempt.is_correct ? 1 : 0)
      });
    });

    return Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject: subject.length > 15 ? subject.substring(0, 15) + '...' : subject,
      total: data.total,
      correct: data.correct,
      accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0
    })).sort((a, b) => b.total - a.total);
  };

  const getBankStats = () => {
    const bankMap = new Map<string, { total: number; correct: number }>();

    attempts.forEach(attempt => {
      const current = bankMap.get(attempt.bank) || { total: 0, correct: 0 };
      bankMap.set(attempt.bank, {
        total: current.total + 1,
        correct: current.correct + (attempt.is_correct ? 1 : 0)
      });
    });

    return Array.from(bankMap.entries()).map(([bank, data]) => ({
      name: bank,
      value: data.total > 0 ? (data.correct / data.total) * 100 : 0,
      total: data.total
    })).sort((a, b) => b.total - a.total);
  };

  const getTimelineData = () => {
    const days = parseInt(selectedPeriod);
    const timeline: { date: string; attempts: number; correct: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayAttempts = attempts.filter(a => 
        format(new Date(a.attempted_at), 'yyyy-MM-dd') === dateStr
      );

      timeline.push({
        date: format(date, 'dd/MM', { locale: ptBR }),
        attempts: dayAttempts.length,
        correct: dayAttempts.filter(a => a.is_correct).length
      });
    }

    return timeline;
  };

  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Acesso Negado</h1>
          <p className="text-gray-600">Você precisa estar logado para ver as estatísticas.</p>
        </div>
      </div>
    );
  }

  const content = (
    <>
      {!hideHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/questoes')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold text-gray-800">Estatísticas de Questões</h1>
          </div>

          <Select value={selectedPeriod} onValueChange={onPeriodChange}>
            <SelectTrigger className="w-32">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Desempenho por Matéria - Gráfico Horizontal */}
        <Card className="bg-white/70 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle>Desempenho por Matéria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={getSubjectStats()} 
                layout="horizontal"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis 
                  type="category" 
                  dataKey="subject" 
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Taxa de Acerto']}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="accuracy" 
                  fill="#10B981" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Desempenho por Banca */}
        <Card className="bg-white/70 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle>Taxa de Acerto por Banca</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getBankStats()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getBankStats().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Taxa de Acerto']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Timeline de Atividade */}
      <Card className="bg-white/70 backdrop-blur-lg border-white/20 mb-6">
        <CardHeader>
          <CardTitle>Atividade Diária</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={getTimelineData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="attempts" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Questões Respondidas"
              />
              <Line 
                type="monotone" 
                dataKey="correct" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Questões Corretas"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Lista de Matérias Detalhada com Gráfico Inline */}
      <Card className="bg-white/70 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle>Detalhamento por Matéria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getSubjectStats().map((subject) => (
              <div key={subject.subject} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-800">{subject.subject}</h3>
                    <p className="text-sm text-gray-600">
                      {subject.correct}/{subject.total} questões corretas
                    </p>
                  </div>
                  <Badge 
                    className={`${
                      subject.accuracy >= 70 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : subject.accuracy >= 50 
                          ? 'bg-yellow-500 hover:bg-yellow-600' 
                          : 'bg-red-500 hover:bg-red-600'
                    } text-white`}
                  >
                    {subject.accuracy.toFixed(1)}%
                  </Badge>
                </div>
                <InlineProgress 
                  correct={subject.correct} 
                  total={subject.total}
                  className="mt-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );

  if (hideHeader) {
    return <div className="space-y-6">{content}</div>;
  }

  return (
    <motion.div 
      className="container mx-auto p-6 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {content}
    </motion.div>
  );
};

export default QuestionsStatistics;
