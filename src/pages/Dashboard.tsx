
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

  const delayedTopics = subjects.flatMap(subject => 
    subject.topics.filter(topic => {
      if (!topic.nextReview) return false;
      const reviewDate = new Date(topic.nextReview);
      const today = new Date();
      return reviewDate < today;
    })
  );

  const progressPercentage = studyProgress.totalTopics > 0 
    ? Math.round((studyProgress.completedTopics / studyProgress.totalTopics) * 100)
    : 0;

  // Calcular ciclos realizados (simulação baseada nos dados existentes)
  const cyclesCompleted = Math.floor(studyProgress.completedTopics / 3);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header com saudação personalizada */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">
          {greeting}! 👋
        </h1>
        <p className="text-gray-600">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {/* Se não há matérias, mostrar estado vazio */}
      {subjects.length === 0 ? (
        <Card className="bg-white border border-gray-200">
          <CardHeader className="text-center">
            <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <CardTitle className="text-gray-900">Bem-vindo ao Sistema de Estudos!</CardTitle>
            <CardDescription className="text-gray-600">
              Comece adicionando suas primeiras matérias para organizar seus estudos.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/materias')} className="bg-gray-900 hover:bg-gray-800 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Matéria
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cards de estatísticas principais - Grid 2x2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Matérias Cadastradas</CardTitle>
                <BookOpen className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{studyProgress.totalSubjects}</div>
                <p className="text-xs text-gray-500">
                  {studyProgress.completedSubjects} concluídas
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Tópicos Cadastrados</CardTitle>
                <Target className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{studyProgress.totalTopics}</div>
                <p className="text-xs text-gray-500">
                  {studyProgress.completedTopics} concluídos
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Progresso Geral</CardTitle>
                <BarChart3 className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{progressPercentage}%</div>
                <Progress value={progressPercentage} className="mt-2 h-2" />
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Ciclos Realizados</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{cyclesCompleted}</div>
                <p className="text-xs text-gray-500">
                  ciclos de revisão
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cards Para Hoje e Atrasados */}
          {(todayTopics.length > 0 || delayedTopics.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card Para Hoje */}
              {todayTopics.length > 0 && (
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <Clock className="h-5 w-5 text-blue-500" />
                      Para Hoje
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      {todayTopics.length} tópicos para revisar hoje
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {todayTopics.slice(0, 3).map((topic, index) => (
                      <div key={topic.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <span className="text-sm text-gray-700">{topic.name}</span>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                          Hoje
                        </Badge>
                      </div>
                    ))}
                    {todayTopics.length > 3 && (
                      <p className="text-xs text-gray-500">
                        e mais {todayTopics.length - 3} tópicos...
                      </p>
                    )}
                    <Button 
                      onClick={() => navigate('/revisoes')} 
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      Ver Todas as Revisões
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Card Atrasados */}
              {delayedTopics.length > 0 && (
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      Atrasados
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      {delayedTopics.length} tópicos em atraso
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {delayedTopics.slice(0, 3).map((topic, index) => (
                      <div key={topic.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                        <span className="text-sm text-gray-700">{topic.name}</span>
                        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                          Atrasado
                        </Badge>
                      </div>
                    ))}
                    {delayedTopics.length > 3 && (
                      <p className="text-xs text-gray-500">
                        e mais {delayedTopics.length - 3} tópicos...
                      </p>
                    )}
                    <Button 
                      onClick={() => navigate('/revisoes')} 
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                      Revisar Atrasados
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Ações Rápidas */}
          <Card className="bg-white border border-gray-200">
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
  );
};

export default Dashboard;
