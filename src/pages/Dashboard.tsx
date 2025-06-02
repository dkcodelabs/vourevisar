
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

const Dashboard = () => {
  const { subjects, studyProgress, isDataLoaded, isLoading, error } = useApp();
  const { userCycle, isLoading: cycleLoading } = useCycleState();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Buscar dados de revisões para o calendário
  const { data: reviewData, isLoading: reviewLoading } = useQuery({
    queryKey: ['dashboard-reviews', user?.id, currentMonth],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      // Buscar tópicos com next_review no mês atual
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select(`
          id,
          name,
          review_stage,
          next_review,
          subject_id
        `)
        .not('next_review', 'is', null)
        .gte('next_review', startOfMonth.toISOString())
        .lte('next_review', endOfMonth.toISOString());

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

  // Swipe handlers para navegação por meses
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)),
    onSwipedRight: () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)),
    trackMouse: true
  });

  console.log('Dashboard - Render state:', {
    subjectsCount: subjects.length,
    isDataLoaded,
    isLoading,
    error,
    studyProgress,
    userCycle
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

  // Mapear revisões por dia para o calendário
  const revisoesPorDia: Record<string, { subject: string, topic: string, status: 'hoje' | 'pendente' | 'futura' }[]> = {};

  if (reviewData) {
    reviewData.forEach(topic => {
      if (topic.next_review) {
        const reviewDate = startOfDay(new Date(topic.next_review));
        const today = startOfDay(new Date());
        let status: 'hoje' | 'pendente' | 'futura' = 'hoje';
        if (reviewDate.getTime() < today.getTime()) status = 'pendente';
        else if (reviewDate.getTime() > today.getTime()) status = 'futura';
        const dateKey = format(reviewDate, 'yyyy-MM-dd');
        if (!revisoesPorDia[dateKey]) revisoesPorDia[dateKey] = [];
        revisoesPorDia[dateKey].push({ 
          subject: topic.subject_name, 
          topic: topic.name, 
          status 
        });
      }
    });
  }

  // Gerar dias do mês atual
  const diasNoMes = Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() }, (_, i) => i + 1);

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
            onClick={() => navigate('/plano-estudo')}
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

              {/* Card Calendário de Revisões */}
              <Card className="bg-white/60 backdrop-blur-md shadow-xl border-none rounded-3xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-200/60 rounded-full flex items-center justify-center shadow-md">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-blue-900">Calendário de Revisões</CardTitle>
                      <CardDescription className="text-sm text-blue-700">Toque em um dia para ver suas revisões</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {reviewLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                    </div>
                  ) : (
                    <div {...swipeHandlers} className="select-none">
                      <div className="flex justify-between items-center mb-2 px-2">
                        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="text-blue-500 hover:text-blue-700 text-lg">&#8592;</button>
                        <span className="font-bold text-blue-800 text-base">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="text-blue-500 hover:text-blue-700 text-lg">&#8594;</button>
                      </div>
                      <div className="relative">
                        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1">
                          {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                            <div key={i} className="p-1 text-blue-400 font-bold">{d}</div>
                          ))}
                          {Array(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()).fill(null).map((_, i) => (
                            <div key={"empty-"+i}></div>
                          ))}
                          {diasNoMes.map((dia) => {
                            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia);
                            const dateKey = format(startOfDay(date), 'yyyy-MM-dd');
                            const revisoes = revisoesPorDia[dateKey] || [];
                            const temRevisao = revisoes.length > 0;
                            return (
                              <div
                                key={dia}
                                className={`p-2 rounded-2xl font-bold cursor-pointer transition shadow-md ${temRevisao ? 'bg-gradient-to-br from-blue-400/80 to-purple-400/80 text-white hover:scale-105' : 'bg-white/70 text-blue-700 hover:bg-blue-100/60'} ${selectedDay && date.getDate() === selectedDay.getDate() && date.getMonth() === selectedDay.getMonth() ? 'ring-2 ring-blue-500' : ''}`}
                                style={{ minWidth: 36, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" }}
                                onClick={() => { setSelectedDay(date); setShowModal(true); }}
                              >
                                {dia}
                              </div>
                            );
                          })}
                        </div>
                        {/* Painel lateral/embutido de revisões do dia */}
                        {showModal && selectedDay && (
                          <div className="absolute left-0 top-0 w-full h-full z-20 flex items-start justify-center" style={{pointerEvents: 'none'}}>
                            <div className="w-full max-w-md bg-white/90 rounded-2xl shadow-2xl p-4 border border-blue-100 backdrop-blur-md" style={{pointerEvents: 'auto'}}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="flex items-center gap-2 font-bold text-blue-900 text-base">
                                  <Clock className="h-5 w-5 text-blue-600" /> Revisões do dia {format(selectedDay, 'dd/MM/yyyy')}
                                </span>
                                <button className="text-blue-500 hover:text-blue-700 text-xl" onClick={() => setShowModal(false)}>&times;</button>
                              </div>
                              {(() => {
                                const dateKey = format(startOfDay(selectedDay), 'yyyy-MM-dd');
                                const revisoes = revisoesPorDia[dateKey] || [];
                                if (revisoes.length === 0) {
                                  return <div className="text-center text-blue-700 font-medium py-6">Nenhuma revisão para este dia.<br/>Aproveite para descansar ou revisar conteúdos antigos! 😊</div>;
                                }
                                return (
                                  <div className="space-y-4">
                                    {revisoes.filter(r => r.status === 'hoje').length > 0 && (
                                      <div>
                                        <div className="flex items-center gap-2 mb-2 text-yellow-700 font-semibold">
                                          <AlertCircle className="h-4 w-4 text-yellow-500" /> Revisão para Hoje
                                        </div>
                                        <ul className="space-y-2">
                                          {revisoes.filter(r => r.status === 'hoje').map((rev, idx) => (
                                            <li key={idx} className="flex items-center gap-2 bg-white/90 shadow rounded-xl px-3 py-2">
                                              <BookOpen className="h-4 w-4 text-blue-500" />
                                              <span className="font-bold uppercase text-gray-800">{rev.subject}</span>
                                              <span className="text-gray-600">:</span>
                                              <span className="font-medium text-gray-700">{rev.topic}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {revisoes.filter(r => r.status === 'pendente').length > 0 && (
                                      <div>
                                        <div className="flex items-center gap-2 mb-2 text-red-700 font-semibold">
                                          <AlertCircle className="h-4 w-4 text-red-500" /> Revisão Pendente
                                        </div>
                                        <ul className="space-y-2">
                                          {revisoes.filter(r => r.status === 'pendente').map((rev, idx) => (
                                            <li key={idx} className="flex items-center gap-2 bg-white/90 shadow rounded-xl px-3 py-2">
                                              <BookOpen className="h-4 w-4 text-blue-500" />
                                              <span className="font-bold uppercase text-gray-800">{rev.subject}</span>
                                              <span className="text-gray-600">:</span>
                                              <span className="font-medium text-gray-700">{rev.topic}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {revisoes.filter(r => r.status === 'futura').length > 0 && (
                                      <div>
                                        <div className="flex items-center gap-2 mb-2 text-blue-700 font-semibold">
                                          <CheckCircle2 className="h-4 w-4 text-blue-500" /> Revisão Futura
                                        </div>
                                        <ul className="space-y-2">
                                          {revisoes.filter(r => r.status === 'futura').map((rev, idx) => (
                                            <li key={idx} className="flex items-center gap-2 bg-white/90 shadow rounded-xl px-3 py-2">
                                              <BookOpen className="h-4 w-4 text-blue-500" />
                                              <span className="font-bold uppercase text-gray-800">{rev.subject}</span>
                                              <span className="text-gray-600">:</span>
                                              <span className="font-medium text-gray-700">{rev.topic}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

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
                    onClick={() => navigate('/plano-estudo')}
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
