import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, BookOpen, Target, TrendingUp, Clock, CheckCircle2, AlertCircle, Plus, BarChart3, Check, X, HelpCircle, Eye, Timer, Brain, Users, Activity } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useCycleState } from '@/hooks/useCycleState';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay, isBefore, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarView } from '@/components/calendar/CalendarView';
import { Loader2 } from "lucide-react";
import { CircularProgress } from '@/components/dashboard/CircularProgress';
import { StatCard } from '@/components/dashboard/StatCard';
import { PomodoroCard } from '@/components/dashboard/PomodoroCard';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const { subjects, studyProgress, isDataLoaded, isLoading, error } = useApp();
  const { userCycle, isLoading: cycleLoading } = useCycleState();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Buscar dados de revisões para o calendário
  const { data: reviewData, isLoading: reviewLoading } = useQuery({
    queryKey: ['dashboard-reviews', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Buscar tópicos com next_review
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select(`
          id,
          name,
          review_stage,
          next_review,
          subject_id
        `)
        .not('next_review', 'is', null);

      if (topicsError) {
        console.error('Error fetching review data:', topicsError);
        throw topicsError;
      }

      if (!topicsData || topicsData.length === 0) {
        return [];
      }

      // Buscar subjects do usuário
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('user_id', user.id);

      if (subjectsError) {
        console.error('Error fetching subjects:', subjectsError);
        throw subjectsError;
      }

      // Filtrar apenas tópicos que pertencem aos subjects do usuário
      const userSubjectIds = (subjectsData || []).map(s => s.id);
      const filteredTopics = topicsData.filter(topic =>
        userSubjectIds.includes(topic.subject_id)
      );

      // Mapear com nomes dos subjects
      const topicsWithSubjects = filteredTopics.map(topic => {
        const subject = subjectsData?.find(s => s.id === topic.subject_id);
        return {
          id: topic.id,
          name: topic.name,
          subject_name: subject?.name || 'Sem disciplina',
          review_stage: topic.review_stage,
          next_review: topic.next_review,
        };
      });

      console.log('Dashboard review data loaded:', topicsWithSubjects);
      return topicsWithSubjects;
    },
    enabled: !!user
  });



  // Estados de loading e erro simplificados
  if (isLoading || cycleLoading) {
    console.log('Dashboard - Showing loading state');
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-300" />
      </div>
    );
  }

  if (error) {
    console.log('Dashboard - Showing error state:', error);
    return (
      <div className="container mx-auto p-6">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-red-600">Erro ao carregar dados</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()}>
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mostrar estado vazio mesmo se não há matérias
  if (!isDataLoaded) {
    console.log('Dashboard - Data not loaded yet');
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-300" />
      </div>
    );
  }

  console.log('Dashboard - Rendering main content with', subjects.length, 'subjects');

  // Função para obter revisões para uma data específica
  const getReviewsForDate = (date: Date) => {
    if (!reviewData) return [];

    return reviewData.filter(topic => {
      if (!topic.next_review) return false;
      const reviewDate = startOfDay(new Date(topic.next_review));
      return reviewDate.getTime() === startOfDay(date).getTime();
    });
  };

  // Determinar quais revisões mostrar na seção "Revisão"
  const getDisplayedReviews = () => {
    if (selectedCalendarDate) {
      return getReviewsForDate(selectedCalendarDate);
    }

    // Se nenhuma data selecionada, mostrar revisões de hoje
    const today = new Date();
    return getReviewsForDate(today);
  };

  // Obter texto para exibir na seção "Revisão"
  const getReviewSectionTitle = () => {
    if (selectedCalendarDate) {
      return `Revisões de ${format(selectedCalendarDate, 'dd \'de\' MMMM', { locale: ptBR })}`;
    }
    return 'Revisões de hoje';
  };

  const handleCalendarDateSelect = (date: Date) => {
    setSelectedCalendarDate(date);
    setCalendarMonth(date);
  };

  const handleGoToToday = () => {
    const today = new Date();
    setSelectedCalendarDate(today);
    setCalendarMonth(today);
  };

  const displayedReviews = getDisplayedReviews();

  // Calculate progress data
  const totalTopics = subjects.reduce((total, subject) => total + subject.topics.length, 0);
  const completedTopics = subjects.reduce((total, subject) => total + subject.topics.filter(t => t.completed).length, 0);
  const totalSubjects = subjects.length;
  const completedSubjects = subjects.filter(s => s.status === 'Concluída').length;

  const overallProgress = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;
  const subjectProgress = totalSubjects > 0 ? (completedSubjects / totalSubjects) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto p-6">
        {/* Header com animação */}
        {/* Removido o título principal */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Painel
          </h1>
        </motion.div> */}

        {/* Se não há matérias, mostrar estado vazio */}
        {subjects.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
            <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Bem-vindo ao Sistema de Estudos!</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Comece adicionando suas primeiras matérias para organizar seus estudos e acompanhar seu progresso.
            </p>
            <Button
              onClick={() => navigate('/materias')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold"
            >
              <Plus className="h-5 w-5 mr-2" />
              Adicionar Primeira Matéria
            </Button>
          </div>
        ) : (



          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
            {/* Coluna 1 - Overview */}
            <div className="xl:col-span-3">
              <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center gap-6 h-[420px]">

                <h1
                  className="text-2xl font-semibold text-gray-900"
                  style={{ fontFamily: 'Nunito, sans-serif' }}
                >
                  Olá, {user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário'}
                </h1>

                <div className="flex items-center gap-4 mt-5">

                  {/* Círculo de progresso */}
                  <div className="flex-shrink-0">
                    <CircularProgress
                      percentage={overallProgress}
                      size={60}
                      strokeWidth={4}
                      color="#3B82F6"
                      bgColor="#E5E7EB"
                      showPercentage={true}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Seu Progresso</p>
                    <p className="font-semibold text-gray-900">Incrível 🥳</p>
                  </div>
                </div>



                {/* Botão */}
                <button
                  className="mt-6 bg-indigo-600 text-white text-sm font-medium py-2 px-4 rounded-full hover:bg-indigo-700 transition"
                  onClick={() => navigate('/plano-estudos')}
                  style={{ fontFamily: 'Inter, Nunito, sans-serif' }}
                >
                  Ver Plano de Estudos
                </button>

                {/* Imagem de comemoração */}
                <img
                  src="/celebration.png"
                  alt="Comemoração"
                  className="w-40 mx-auto mt-2"
                  style={{ minHeight: 100 }}
                />
              </div>
            </div>

            {/* Coluna 2 - 4 cards dividindo igualmente a altura */}
            <div className="xl:col-span-3 h-[420px]">
              <div className="flex flex-col h-full gap-4">
                <StatCard className="flex-1 min-h-0" title="Matérias Concluídas" value={completedSubjects} subtitle={`de ${totalSubjects} matérias`} icon={BookOpen} iconBgColor="#E8F5E8" iconColor="#10B981" />
                <StatCard className="flex-1 min-h-0" title="Tópicos Pendentes" value={totalTopics - completedTopics} subtitle="Para revisar" icon={AlertCircle} iconBgColor="#FFF4E6" iconColor="#F59E0B" />
                <PomodoroCard className="flex-1 min-h-0" />
              </div>
            </div>

            {/* Coluna 3 - Calendário e Revisões lado a lado, ambos com altura igual */}
            <div className="xl:col-span-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[420px]">
                {/* Calendário */}
                <div className="h-full">
                  <CalendarView
                    reviewData={reviewData || []}
                    isLoading={reviewLoading}
                    onDateSelect={handleCalendarDateSelect}
                    selectedDate={selectedCalendarDate || undefined}
                    currentMonth={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full"
                  />
                </div>
                {/* Card Revisões de hoje */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {getReviewSectionTitle()}
                    </h3>
                    {selectedCalendarDate && (
                      <button
                        onClick={handleGoToToday}
                        title="Ver revisões de hoje"
                        className="text-blue-500 hover:text-blue-600"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  {displayedReviews.length > 0 ? (
                    <div className="space-y-3">
                      {(() => {
                        const reviewsBySubject = displayedReviews.reduce((acc, topic) => {
                          const subjectName = topic.subject_name;
                          if (!acc[subjectName]) {
                            acc[subjectName] = [];
                          }
                          acc[subjectName].push(topic);
                          return acc;
                        }, {} as Record<string, typeof displayedReviews>);

                        return Object.entries(reviewsBySubject).map(([subjectName, topics]) => (
                          <div key={subjectName} className="border-l-4 border-blue-500 pl-4">
                            <h4 className="font-semibold text-gray-900 text-sm mb-2">{subjectName}</h4>
                            <div className="space-y-2">
                              {topics.map((topic) => {
                                const isOverdue = topic.next_review &&
                                  startOfDay(new Date(topic.next_review)).getTime() < startOfDay(new Date()).getTime();
                                const isToday = topic.next_review &&
                                  startOfDay(new Date(topic.next_review)).getTime() === startOfDay(new Date()).getTime();

                                return (
                                  <div
                                    key={topic.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                  >
                                    <div className="flex-1">
                                      <h5 className="font-medium text-gray-900 text-sm">{topic.name}</h5>
                                      <p className="text-xs text-gray-600 mt-1">
                                        {topic.next_review ? format(new Date(topic.next_review), 'dd/MM/yyyy', { locale: ptBR }) : 'Sem data'}
                                      </p>
                                    </div>
                                    <Badge
                                      variant={isOverdue ? "destructive" : isToday ? "default" : "secondary"}
                                      className="text-xs"
                                    >
                                      {topic.review_stage || 'Novo'}
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <p className="text-gray-500">Nenhuma revisão para esta data.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
