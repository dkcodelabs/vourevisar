
import React, { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  LineChart, Line
} from 'recharts';
import { isAfter, isBefore, isToday, startOfWeek, endOfWeek, eachDayOfInterval, 
  format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Statistics = () => {
  const { subjects, studyProgress, fetchSubjects } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchSubjects();
      setIsLoading(false);
    };
    
    loadData();
  }, [fetchSubjects]);

  // Dados para o gráfico de status dos tópicos
  const topicStatusData = [
    { name: 'Concluídos', value: studyProgress.completedTopics || 0 },
    { name: 'Atrasados', value: studyProgress.delayedTopics || 0 },
    { name: 'Para Hoje', value: studyProgress.todayTopics || 0 },
    { name: 'Futuros', value: studyProgress.futureTopics || 0 }
  ].filter(item => item.value > 0);

  // Preparar dados para o gráfico de barras por matéria
  const subjectTopicsData = subjects.map(subject => {
    // Contar tópicos por status
    let completed = 0;
    let delayed = 0;
    let today = 0;
    let future = 0;
    
    subject.topics.forEach(topic => {
      if (topic.completed && (!topic.nextReview || topic.reviewStage === 'Concluído')) {
        completed++;
      } else if (topic.nextReview) {
        const reviewDate = new Date(topic.nextReview);
        
        if (isToday(reviewDate)) {
          today++;
        } else if (isBefore(reviewDate, new Date())) {
          delayed++;
        } else if (isAfter(reviewDate, new Date())) {
          future++;
        }
      }
    });
    
    return {
      name: subject.name,
      total: subject.topics.length,
      concluidos: completed,
      atrasados: delayed,
      hoje: today,
      futuros: future
    };
  }).filter(subject => subject.total > 0);

  // Preparar dados para o gráfico de progressão semanal (dados reais)
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(today)
  });

  // Dados para gráfico mensal
  const lastThreeMonths = Array.from({length: 3}, (_, i) => subMonths(new Date(), i));
  const monthlyProgressData = lastThreeMonths.map(date => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const monthName = format(date, 'MMM');
    
    // Contar tópicos concluídos no mês (simulado, mas poderia vir dos dados reais)
    const completedInMonth = Math.floor(Math.random() * 10) + 5;
    const reviewedInMonth = Math.floor(Math.random() * 8) + 3;
    
    return {
      month: monthName,
      concluidos: completedInMonth,
      revisados: reviewedInMonth
    };
  }).reverse();

  // Cálculo de percentuais para cards de resumo
  const completedPercentage = studyProgress.totalTopics > 0 
    ? Math.round((studyProgress.completedTopics / studyProgress.totalTopics) * 100) 
    : 0;

  const delayedPercentage = studyProgress.totalTopics > 0 
    ? Math.round((studyProgress.delayedTopics / studyProgress.totalTopics) * 100)
    : 0;

  const todayPercentage = studyProgress.totalTopics > 0
    ? Math.round((studyProgress.todayTopics / studyProgress.totalTopics) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-app-blue"></div>
      </div>
    );
  }

  // Se não houver dados suficientes para mostrar estatísticas
  const hasData = subjects.length > 0 && studyProgress.totalTopics > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Estatísticas de Estudo</h1>

      {!hasData ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p>Não há dados suficientes para exibir estatísticas.</p>
            <p className="text-sm text-gray-500 mt-2">
              Adicione matérias e tópicos para começar a acompanhar seu progresso.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
            <Card className="md:col-span-8">
              <CardHeader>
                <CardTitle>Progresso Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyProgressData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="concluidos" 
                        stroke="#8884d8" 
                        name="Tópicos Concluídos" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revisados" 
                        stroke="#82ca9d" 
                        name="Tópicos Revisados" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-4">
              <CardHeader>
                <CardTitle>Distribuição de Tópicos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex flex-col items-center justify-center">
                  {topicStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topicStatusData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {topicStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [value, 'Quantidade']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-gray-500">
                      Não há tópicos suficientes para mostrar a distribuição.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Progresso por Matéria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                {subjectTopicsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={subjectTopicsData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="concluidos" stackId="a" fill="#00C49F" name="Concluídos" />
                      <Bar dataKey="hoje" stackId="a" fill="#FFBB28" name="Para Hoje" />
                      <Bar dataKey="atrasados" stackId="a" fill="#FF8042" name="Atrasados" />
                      <Bar dataKey="futuros" stackId="a" fill="#0088FE" name="Futuros" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500">
                    Não há matérias com tópicos suficientes para mostrar o progresso.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold">{completedPercentage}%</h3>
                  <p className="text-sm text-gray-500">Tópicos Concluídos</p>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full" 
                      style={{ width: `${completedPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold">{delayedPercentage}%</h3>
                  <p className="text-sm text-gray-500">Tópicos Atrasados</p>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full" 
                      style={{ width: `${delayedPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold">{todayPercentage}%</h3>
                  <p className="text-sm text-gray-500">Tópicos para Hoje</p>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-500 rounded-full" 
                      style={{ width: `${todayPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Statistics;
