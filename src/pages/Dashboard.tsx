import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, BookOpen, Target, TrendingUp, Clock, CheckCircle2, AlertCircle, Plus, BarChart3 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useCycleState } from '@/hooks/useCycleState';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useSwipeable } from 'react-swipeable';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarView } from '@/components/calendar/CalendarView';

const Dashboard = () => {
  const { subjects, studyProgress, isDataLoaded, isLoading, error } = useApp();
  const { userCycle, isLoading: cycleLoading } = useCycleState();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

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

  // Função para navegar para o plano de estudos
  const handleStartStudy = () => {
    console.log('Navegando para o plano de estudos...');
    navigate('/plano-estudo');
  };

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
  const todayTopics = reviewData?.filter(topic => {
    if (!topic.next_review) return false;
    const reviewDate = startOfDay(new Date(topic.next_review));
    const today = startOfDay(new Date());
    return reviewDate.getTime() === today.getTime();
  }) || [];

  const progressPercentage = studyProgress.totalTopics > 0 
    ? Math.round((studyProgress.completedTopics / studyProgress.totalTopics) * 100)
    : 0;

  // Usar dados reais dos ciclos do banco de dados
  const cyclesCompleted = userCycle?.ciclos_realizados || 0;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-1">
              {greeting}! Aqui está seu progresso.
            </h1>
          </div>
          <Button 
            className="bg-blue-500 hover:bg-blue-600 text-white"
            onClick={handleStartStudy}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Iniciar Estudos do Dia
          </Button>
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
            {/* Cards de estatísticas principais - Grid 2x2 com cores originais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium text-gray-600">Matérias Cadastradas</CardTitle>
                      <CardDescription className="text-xs text-gray-500">Progresso geral</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-blue-600">
                    {studyProgress.completedSubjects}/{studyProgress.totalSubjects}
                  </div>
                 
                  <p className="text-xs text-gray-500 mt-2">
                    Você concluiu {studyProgress.completedSubjects} de {studyProgress.totalSubjects} matérias cadastradas.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Target className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium text-gray-600">Tópicos Cadastrados</CardTitle>
                      <CardDescription className="text-xs text-gray-500">Progresso geral</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-purple-600">
                    {studyProgress.completedTopics}/{studyProgress.totalTopics}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Você já concluiu {studyProgress.completedTopics} de {studyProgress.totalTopics} tópicos cadastrados.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium text-gray-600">Progresso Geral</CardTitle>
                      <CardDescription className="text-xs text-gray-500">Ciclo atual</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-green-600">
                    {progressPercentage}%
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Você completou {progressPercentage}% dos seus estudos.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium text-gray-600">Ciclos Realizados</CardTitle>
                      <CardDescription className="text-xs text-gray-500">Total de ciclos completos</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-teal-600">
                    {cyclesCompleted}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Ciclos de estudo completados até agora.
                  </p>
                </CardContent>
              </Card>
            </div>

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

              {/* Card Calendário de Revisões - Usando o novo componente */}
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
                    onClick={handleStartStudy}
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
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
