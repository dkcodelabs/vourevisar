
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, BookOpen, Target, TrendingUp, Clock, CheckCircle2, AlertCircle, Plus, BarChart3 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Dashboard = () => {
  const { subjects, studyProgress, isDataLoaded, isLoading, error } = useApp();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');

  console.log('Dashboard - Render state:', {
    subjectsCount: subjects.length,
    isDataLoaded,
    isLoading,
    error,
    studyProgress
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
  if (isLoading) {
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
  const todayTopics = subjects.flatMap(subject => 
    subject.topics.filter(topic => {
      if (!topic.nextReview) return false;
      const reviewDate = new Date(topic.nextReview);
      const today = new Date();
      return reviewDate.toDateString() === today.toDateString();
    })
  );

  const progressPercentage = studyProgress.totalTopics > 0 
    ? Math.round((studyProgress.completedTopics / studyProgress.totalTopics) * 100)
    : 0;

  // Calcular ciclos realizados (simulação baseada nos dados existentes)
  const cyclesCompleted = Math.floor(studyProgress.completedTopics / 3);

  // Gerar dias do calendário (simples para mostrar o layout)
  const generateCalendarDays = () => {
    const days = [];
    for (let i = 1; i <= 31; i++) {
      days.push(i);
    }
    return days;
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-1">
              Bem-vindo(a) de volta! Aqui está seu progresso.
            </h1>
          </div>
          <Button className="bg-blue-500 hover:bg-blue-600 text-white">
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
                  <div className="text-xs text-gray-600 mt-1">
                    matérias
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
                  <div className="text-xs text-gray-600 mt-1">
                    tópicos
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
                  <div className="text-xs text-gray-600 mt-1">
                    concluído
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Você completou {studyProgress.completedTopics} ciclos de estudo até agora.
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
                      <CardDescription className="text-xs text-gray-500">Progresso do ciclo atual</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-teal-600">
                    {cyclesCompleted}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    ciclos
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Progresso do ciclo atual: {progressPercentage}%
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
                  <div className="text-center py-8">
                    <p className="text-gray-500">Nenhuma revisão agendada para hoje.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Card Calendário de Revisões */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-medium text-gray-900">Calendário de Revisões</CardTitle>
                      <CardDescription className="text-sm text-gray-500">Próximas revisões</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {/* Dias da semana */}
                    {['1', '2', '3', '4', '5', '6', '7'].map((day) => (
                      <div key={day} className="p-1 text-gray-400">{day}</div>
                    ))}
                    {/* Primeira linha */}
                    <div className="p-2"></div>
                    <div className="p-2"></div>
                    <div className="p-2"></div>
                    <div className="p-2"></div>
                    <div className="p-2"></div>
                    <div className="p-2"></div>
                    <div className="p-2"></div>
                    {/* Segunda linha */}
                    <div className="p-2 text-gray-600">8</div>
                    <div className="p-2 text-gray-600">9</div>
                    <div className="p-2 text-gray-600">10</div>
                    <div className="p-2 text-gray-600">11</div>
                    <div className="p-2 text-gray-600">12</div>
                    <div className="p-2 text-gray-600">13</div>
                    <div className="p-2 text-gray-600">14</div>
                    {/* Terceira linha */}
                    <div className="p-2 text-gray-600">15</div>
                    <div className="p-2 text-gray-600">16</div>
                    <div className="p-2 text-gray-600">17</div>
                    <div className="p-2 text-gray-600">18</div>
                    <div className="p-2 text-gray-600">19</div>
                    <div className="p-2 text-gray-600">20</div>
                    <div className="p-2 text-gray-600">21</div>
                    {/* Quarta linha */}
                    <div className="p-2 text-gray-600">22</div>
                    <div className="p-2 text-gray-600">23</div>
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-full">24</div>
                    <div className="p-2 text-gray-600">25</div>
                    <div className="p-2 text-gray-600">26</div>
                    <div className="p-2 text-gray-600">27</div>
                    <div className="p-2 text-gray-600">28</div>
                    {/* Quinta linha */}
                    <div className="p-2 text-gray-600">29</div>
                    <div className="p-2 text-gray-600">30</div>
                    <div className="p-2 bg-blue-500 text-white rounded-full">31</div>
                    <div className="p-2"></div>
                    <div className="p-2"></div>
                    <div className="p-2"></div>
                    <div className="p-2"></div>
                  </div>
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
