import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, BookOpen, Target, TrendingUp, Clock, CheckCircle2, AlertCircle, Plus, BarChart3, Check, X, HelpCircle, Eye } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useCycleState } from '@/hooks/useCycleState';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay, isBefore, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useSwipeable } from 'react-swipeable';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarView } from '@/components/calendar/CalendarView';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Loader2 } from "lucide-react";
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

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Bom dia');
    } else if (hour < 18) {
      setGreeting('Boa tarde');
    } else {
      setGreeting('Boa noite');
    }
  }, []);

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
      return `Revisão - ${format(selectedCalendarDate, 'dd/MM/yyyy')}`;
    }
    return 'Revisão - Hoje';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Simplificado */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-1">
              {greeting}! Aqui está seu progresso.
            </h1>
          </div>
        </div>

        {/* Se não há matérias, mostrar estado vazio */}
        {subjects.length === 0 ? (
          <Card className="bg-white">
            <CardHeader className="text-center">
              <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <CardTitle>Bem-vindo ao Sistema de Estudos!</CardTitle>
              <CardDescription>
                Comece adicionando suas primeiras matérias para organizar seus estudos.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate('/materias')} className="bg-blue-500 hover:bg-blue-600 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeira Matéria
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card Matérias */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">Matérias</h3>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Não iniciada</span>
                          <span className="text-sm font-medium text-gray-900">
                            {subjects.filter(s => s.status === 'Nova').length}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Concluídas</span>
                          <span className="text-sm font-medium text-gray-900">
                            {subjects.filter(s => s.status === 'Concluída').length} de {subjects.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card Tópicos */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Target className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">Tópicos</h3>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Não iniciado</span>
                          <span className="text-sm font-medium text-gray-900">
                            {subjects.reduce((total, subject) => total + subject.topics.filter(t => !t.completed).length, 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Concluídos</span>
                          <span className="text-sm font-medium text-gray-900">
                            {subjects.reduce((total, subject) => total + subject.topics.filter(t => t.completed).length, 0)} de {subjects.reduce((total, subject) => total + subject.topics.length, 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card Revisões */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">Revisões</h3>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Hoje</span>
                          <span className="text-sm font-medium text-gray-900">
                            {reviewData ? reviewData.filter(topic => {
                              if (!topic.next_review) return false;
                              const reviewDate = startOfDay(new Date(topic.next_review));
                              const today = startOfDay(new Date());
                              return reviewDate.getTime() === today.getTime();
                            }).length : 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Atrasadas</span>
                          <span className="text-sm font-medium text-gray-900">
                            {reviewData ? reviewData.filter(topic => {
                              if (!topic.next_review) return false;
                              const reviewDate = startOfDay(new Date(topic.next_review));
                              const today = startOfDay(new Date());
                              return reviewDate.getTime() < today.getTime();
                            }).length : 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Futuras</span>
                          <span className="text-sm font-medium text-gray-900">
                            {reviewData ? reviewData.filter(topic => {
                              if (!topic.next_review) return false;
                              const reviewDate = startOfDay(new Date(topic.next_review));
                              const today = startOfDay(new Date());
                              return reviewDate.getTime() > today.getTime();
                            }).length : 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cards Revisão e Calendário */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card Revisão (dinâmico baseado na data selecionada) */}
              <Card className="bg-white border border-gray-200 shadow-sm relative">
                {/* Ícone de "Ver revisões de hoje" no canto superior direito */}
                {selectedCalendarDate && (
                  <button
                    onClick={handleGoToToday}
                    title="Ver revisões de hoje"
                    className="absolute top-4 right-4 bg-blue-50 hover:bg-blue-100 rounded-full p-2 shadow transition-colors"
                    style={{ lineHeight: 0 }}
                  >
                    <Eye className="h-5 w-5 text-blue-600" />
                  </button>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-medium text-gray-900">
                        {getReviewSectionTitle()}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-500">
                        {selectedCalendarDate ? 'Data selecionada' : 'Tópicos agendados'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {reviewLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600" />
                    </div>
                  ) : displayedReviews.length > 0 ? (
                    <div className="space-y-2">
                      {displayedReviews.map((topic, idx) => {
                        // Determina o status da revisão
                        const reviewDate = startOfDay(new Date(topic.next_review));
                        const today = startOfDay(new Date());
                        let status: 'pendente' | 'hoje' | 'futura' = 'futura';
                        if (reviewDate.getTime() === today.getTime()) {
                          status = 'hoje';
                        } else if (reviewDate.getTime() < today.getTime()) {
                          status = 'pendente';
                        }

                        // Define a cor de fundo de acordo com o status
                        const bgColor =
                          status === 'pendente'
                            ? 'bg-red-50 border border-red-200'
                            : status === 'hoje'
                            ? 'bg-yellow-50 border border-yellow-200'
                            : 'bg-green-50 border border-green-200';

                        return (
                          <div key={idx} className={`p-3 rounded-lg ${bgColor}`}>
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-orange-600" />
                              <span className="font-semibold text-gray-800">{topic.subject_name}</span>
                              <span className="text-gray-600">:</span>
                              <span className="text-gray-700">{topic.name}</span>
                            </div>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {topic.review_stage}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <h2 className="text-gray-700 text-lg font-semibold mb-2">
                        Nenhuma revisão agendada para este dia
                      </h2>
                      <p className="text-gray-500">
                        Aproveite para revisar outros conteúdos, reforçar pontos importantes ou tirar um tempo para descansar.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card Calendário de Revisões */}
              <CalendarView
                reviewData={reviewData || []}
                isLoading={reviewLoading}
                onDateSelect={handleCalendarDateSelect}
                selectedDate={selectedCalendarDate || undefined}
                currentMonth={calendarMonth}
                onMonthChange={setCalendarMonth}
                className="bg-white/60 backdrop-blur-md shadow-xl border-none rounded-3xl"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
