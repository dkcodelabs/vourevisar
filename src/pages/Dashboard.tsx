import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Simplificado */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
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
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground mb-3">Matérias</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Concluídas</span>
                          <span className="text-sm font-semibold text-foreground">
                            {subjects.filter(s => s.status === 'Concluída').length} de {subjects.length}
                          </span>
                        </div>
                        <Progress 
                          value={subjects.length > 0 ? (subjects.filter(s => s.status === 'Concluída').length / subjects.length) * 100 : 0} 
                          className="h-2"
                        />
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>Não iniciadas: {subjects.filter(s => s.status === 'Nova').length}</span>
                          <span>{subjects.length > 0 ? Math.round((subjects.filter(s => s.status === 'Concluída').length / subjects.length) * 100) : 0}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card Tópicos */}
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Target className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground mb-3">Tópicos</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Concluídos</span>
                          <span className="text-sm font-semibold text-foreground">
                            {subjects.reduce((total, subject) => total + subject.topics.filter(t => t.completed).length, 0)} de {subjects.reduce((total, subject) => total + subject.topics.length, 0)}
                          </span>
                        </div>
                        <Progress 
                          value={subjects.reduce((total, subject) => total + subject.topics.length, 0) > 0 ? 
                            (subjects.reduce((total, subject) => total + subject.topics.filter(t => t.completed).length, 0) / 
                             subjects.reduce((total, subject) => total + subject.topics.length, 0)) * 100 : 0} 
                          className="h-2"
                        />
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>Não iniciados: {subjects.reduce((total, subject) => total + subject.topics.filter(t => !t.completed).length, 0)}</span>
                          <span>{subjects.reduce((total, subject) => total + subject.topics.length, 0) > 0 ? 
                            Math.round((subjects.reduce((total, subject) => total + subject.topics.filter(t => t.completed).length, 0) / 
                                       subjects.reduce((total, subject) => total + subject.topics.length, 0)) * 100) : 0}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card Revisões */}
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground mb-3">Revisões</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-muted-foreground">Hoje</span>
                          </div>
                          <span className="text-sm font-semibold text-foreground">
                            {reviewData ? reviewData.filter(topic => {
                              if (!topic.next_review) return false;
                              const reviewDate = startOfDay(new Date(topic.next_review));
                              const today = startOfDay(new Date());
                              return reviewDate.getTime() === today.getTime();
                            }).length : 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                            <span className="text-sm text-muted-foreground">Atrasadas</span>
                          </div>
                          <span className="text-sm font-semibold text-foreground">
                            {reviewData ? reviewData.filter(topic => {
                              if (!topic.next_review) return false;
                              const reviewDate = startOfDay(new Date(topic.next_review));
                              const today = startOfDay(new Date());
                              return reviewDate.getTime() < today.getTime();
                            }).length : 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-sm text-muted-foreground">Futuras</span>
                          </div>
                          <span className="text-sm font-semibold text-foreground">
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
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 relative">
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
                      <CardTitle className="text-lg font-bold text-foreground">
                        {getReviewSectionTitle()}
                      </CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
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
                    <div className="space-y-4">
                      {/* Agrupar revisões por matéria */}
                      {(() => {
                        const groupedReviews = displayedReviews.reduce((groups, topic) => {
                          const subjectName = topic.subject_name;
                          if (!groups[subjectName]) {
                            groups[subjectName] = [];
                          }
                          groups[subjectName].push(topic);
                          return groups;
                        }, {} as Record<string, typeof displayedReviews>);

                        return Object.entries(groupedReviews).map(([subjectName, topics]) => (
                          <div key={subjectName} className="space-y-2">
                            {/* Subtítulo da disciplina */}
                            <h4 className="text-sm font-bold text-foreground border-b border-border pb-1">
                              {subjectName}
                            </h4>
                            {/* Lista de tópicos */}
                            <div className="space-y-2">
                              {topics.map((topic, idx) => {
                                // Determina o status da revisão
                                const reviewDate = startOfDay(new Date(topic.next_review));
                                const today = startOfDay(new Date());
                                let status: 'pendente' | 'hoje' | 'futura' = 'futura';
                                if (reviewDate.getTime() === today.getTime()) {
                                  status = 'hoje';
                                } else if (reviewDate.getTime() < today.getTime()) {
                                  status = 'pendente';
                                }

                                return (
                                  <div key={idx} className="flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded-md transition-colors">
                                    <span className="text-sm text-foreground font-medium">
                                      {topic.name}
                                    </span>
                                    <Badge 
                                      variant={
                                        status === 'pendente' ? 'destructive' :
                                        status === 'hoje' ? 'default' : 'secondary'
                                      }
                                      className="text-xs px-2 py-1"
                                    >
                                      {topic.review_stage}
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
                    <div className="text-center py-8">
                      <h2 className="text-muted-foreground text-base font-medium mb-2">
                        Nenhuma revisão agendada para este dia
                      </h2>
                      <p className="text-muted-foreground text-sm">
                        Aproveite para revisar outros conteúdos ou descansar.
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
                className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 rounded-lg bg-card"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
