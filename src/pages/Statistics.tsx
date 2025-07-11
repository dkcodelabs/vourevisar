
import React, { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  LineChart, Line
} from 'recharts';
import { isAfter, isBefore, isToday, startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { TooltipProvider } from '@/components/ui/tooltip';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Statistics = () => {
  const { subjects, studyProgress, fetchSubjects } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setHasError(false);
      
      try {
        await fetchSubjects();
        setIsLoading(false);
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        setHasError(true);
        setIsLoading(false);
        toast.error("Erro ao carregar dados estatísticos");
      }
    };
    
    loadData();
  }, []);

  // Dados para o gráfico de status dos tópicos
  const topicStatusData = [
    { name: 'Concluídos', value: studyProgress?.completedTopics || 0 },
    { name: 'Atrasados', value: studyProgress?.delayedTopics || 0 },
    { name: 'Para Hoje', value: studyProgress?.todayTopics || 0 },
    { name: 'Futuros', value: studyProgress?.futureTopics || 0 }
  ];

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
  });

  // Preparar dados para o gráfico de progressão semanal (simulado)
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(today)
  });

  // Em uma aplicação real, estes dados viriam de registros históricos
  // Aqui estamos apenas simulando para fins de demonstração
  const weeklyProgressData = weekDays.map((day, index) => {
    const dayName = format(day, 'EEE');
    // Simular dados com base no índice
    const completedThisDay = Math.floor(Math.random() * 5) + (index * 2);
    const reviewedThisDay = Math.floor(Math.random() * 3) + index;
    
    return {
      day: dayName,
      concluidos: completedThisDay,
      revisados: reviewedThisDay
    };
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-app-blue"></div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Erro</h1>
        <p>Não foi possível carregar os dados estatísticos</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-app-blue text-white rounded hover:bg-app-light-blue"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  // Check if the data is available before rendering charts
  const hasData = subjects.length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-10">
        <h1 className="text-3xl font-bold">Estatísticas de Estudo</h1>
        <p className="mt-4 text-gray-600">Nenhum dado disponível para exibir estatísticas.</p>
        <p className="text-gray-600">Adicione matérias e tópicos para começar a ver suas estatísticas.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Estatísticas
            </h1>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
            <Card className="md:col-span-8">
              <CardHeader>
                <CardTitle>Progresso Semanal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyProgressData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
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
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
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
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold">{studyProgress?.completedTopics || 0}</h3>
                  <p className="text-sm text-gray-500">Tópicos Concluídos</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold">{studyProgress?.todayTopics || 0}</h3>
                  <p className="text-sm text-gray-500">Revisões para Hoje</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold">
                    {studyProgress?.totalTopics > 0 
                      ? Math.round((studyProgress?.completedTopics / studyProgress?.totalTopics) * 100) 
                      : 0}%
                  </h3>
                  <p className="text-sm text-gray-500">Progresso Total</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Statistics;
