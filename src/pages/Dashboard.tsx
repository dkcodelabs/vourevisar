
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, BookOpen, Target, TrendingUp, Clock, CheckCircle2, AlertCircle, Plus, BarChart3, Check, X } from 'lucide-react';
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
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [tab, setTab] = useState<'hoje' | 'futuras'>('hoje');

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

  // Cálculos para estatísticas
  const delayedTopics = reviewData?.filter(topic => {
    if (!topic.next_review) return false;
    const reviewDate = startOfDay(new Date(topic.next_review));
    const today = startOfDay(new Date());
    return isBefore(reviewDate, today);
  }) || [];

  const todayTopics = reviewData?.filter(topic => {
    if (!topic.next_review) return false;
    const reviewDate = startOfDay(new Date(topic.next_review));
    const today = startOfDay(new Date());
    return reviewDate.getTime() === today.getTime();
  }) || [];

  const futureTopics = reviewData?.filter(topic => {
    if (!topic.next_review) return false;
    const reviewDate = startOfDay(new Date(topic.next_review));
    const today = startOfDay(new Date());
    return reviewDate > today;
  }) || [];

  const handleCalendarDateSelect = (date: Date) => {
    setSelectedCalendarDate(date);
    setShowReviewModal(true);
  };

  // Obter revisões para a data selecionada
  const getReviewsForDate = (date: Date) => {
    if (!reviewData) return [];
    
    return reviewData.filter(topic => {
      if (!topic.next_review) return false;
      const reviewDate = startOfDay(new Date(topic.next_review));
      return reviewDate.getTime() === startOfDay(date).getTime();
    });
  };

  function agruparPorMateria(topics) {
    if (!Array.isArray(topics)) return {};
    const materias = {};
    topics.forEach(topic => {
      if (!materias[topic.subject_name]) materias[topic.subject_name] = [];
      materias[topic.subject_name].push(topic);
    });
    return materias;
  }

  function separarPorStatus(topics) {
    const hoje = startOfDay(new Date());
    return {
      atrasados: topics.filter(t => t.next_review && isBefore(startOfDay(new Date(t.next_review)), hoje)),
      hoje: topics.filter(t => t.next_review && startOfDay(new Date(t.next_review)).getTime() === hoje.getTime()),
      futuras: topics.filter(t => t.next_review && new Date(t.next_review) > hoje && startOfDay(new Date(t.next_review)).getTime() !== hoje.getTime()),
    };
  }

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
            {/* Ações Rápidas */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">Ações Rápidas</CardTitle>
                <CardDescription className="text-gray-600">
                  Acesse rapidamente as funcionalidades principais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/plano-estudos')}
                    className="border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Estudar
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/revisoes')}
                    className="border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Revisões
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/materias')}
                    className="border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Matérias
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/estatisticas')}
                    className="border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Estatísticas
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Cards Revisões para Hoje e Calendário */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card Revisões para Hoje */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-medium text-gray-900">Revisões para Hoje</CardTitle>
                      <CardDescription className="text-sm text-gray-500">Tópicos agendados</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {reviewLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600" />
                    </div>
                  ) : todayTopics.length > 0 ? (
                    <div className="space-y-2">
                      {todayTopics.map((topic, idx) => (
                        <div key={idx} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
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
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Nenhuma revisão agendada para hoje.</p>
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
                className="bg-white/60 backdrop-blur-md shadow-xl border-none rounded-3xl"
              />
            </div>

            {/* Modal de revisões do dia selecionado */}
            {showReviewModal && selectedCalendarDate && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      Revisões para {format(selectedCalendarDate, 'dd/MM/yyyy')}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowReviewModal(false)}
                    >
                      ✕
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {getReviewsForDate(selectedCalendarDate).map((review, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                        <div className="font-medium text-gray-900">{review.subject_name}</div>
                        <div className="text-gray-700">{review.name}</div>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {review.review_stage}
                        </Badge>
                      </div>
                    ))}
                    
                    {getReviewsForDate(selectedCalendarDate).length === 0 && (
                      <p className="text-gray-500 text-center py-4">
                        Nenhuma revisão agendada para este dia.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
