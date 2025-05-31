
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, BookOpen, Target, TrendingUp, Clock, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
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

  const recentSubjects = subjects
    .filter(subject => subject.topics.length > 0)
    .slice(0, 3);

  const progressPercentage = studyProgress.totalTopics > 0 
    ? Math.round((studyProgress.completedTopics / studyProgress.totalTopics) * 100)
    : 0;

  return (
    <motion.div 
      className="container mx-auto p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
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
        <Card>
          <CardHeader className="text-center">
            <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <CardTitle>Bem-vindo ao Sistema de Estudos!</CardTitle>
            <CardDescription>
              Comece adicionando suas primeiras matérias para organizar seus estudos.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/materias')}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Matéria
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cards de estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Matérias</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studyProgress.totalSubjects}</div>
                <p className="text-xs text-muted-foreground">
                  {studyProgress.completedSubjects} concluídas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Progresso Geral</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{progressPercentage}%</div>
                <Progress value={progressPercentage} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Para Hoje</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayTopics.length}</div>
                <p className="text-xs text-muted-foreground">
                  tópicos para revisar
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{delayedTopics.length}</div>
                <p className="text-xs text-muted-foreground">
                  tópicos em atraso
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Resumo de atividades para hoje */}
          {(todayTopics.length > 0 || delayedTopics.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Atividades de Hoje
                </CardTitle>
                <CardDescription>
                  Tópicos que precisam da sua atenção hoje
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {delayedTopics.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-600 mb-2">Atrasados ({delayedTopics.length})</h4>
                    <div className="space-y-2">
                      {delayedTopics.slice(0, 3).map((topic, index) => (
                        <div key={topic.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                          <span className="text-sm">{topic.name}</span>
                          <Badge variant="destructive">Atrasado</Badge>
                        </div>
                      ))}
                      {delayedTopics.length > 3 && (
                        <p className="text-xs text-gray-500">
                          e mais {delayedTopics.length - 3} tópicos...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {todayTopics.length > 0 && (
                  <div>
                    <h4 className="font-medium text-blue-600 mb-2">Para Hoje ({todayTopics.length})</h4>
                    <div className="space-y-2">
                      {todayTopics.slice(0, 3).map((topic, index) => (
                        <div key={topic.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                          <span className="text-sm">{topic.name}</span>
                          <Badge variant="secondary">Hoje</Badge>
                        </div>
                      ))}
                      {todayTopics.length > 3 && (
                        <p className="text-xs text-gray-500">
                          e mais {todayTopics.length - 3} tópicos...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <Button onClick={() => navigate('/revisoes')} className="w-full">
                  Ver Todas as Revisões
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Matérias recentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Suas Matérias
              </CardTitle>
              <CardDescription>
                Progresso das suas matérias de estudo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSubjects.map((subject) => {
                  const completedTopics = subject.topics.filter(topic => 
                    topic.reviewStage === 'Concluído' && topic.nextReview === null
                  ).length;
                  const totalTopics = subject.topics.length;
                  const percentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

                  return (
                    <div key={subject.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{subject.name}</span>
                        <span className="text-sm text-gray-600">
                          {completedTopics}/{totalTopics} tópicos
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
                
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/materias')} 
                  className="w-full"
                >
                  Ver Todas as Matérias
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ações rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
              <CardDescription>
                Acesse rapidamente as funcionalidades principais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" onClick={() => navigate('/plano-estudo')}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Estudar
                </Button>
                <Button variant="outline" onClick={() => navigate('/revisoes')}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Revisões
                </Button>
                <Button variant="outline" onClick={() => navigate('/materias')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Matérias
                </Button>
                <Button variant="outline" onClick={() => navigate('/estatisticas')}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Estatísticas
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </motion.div>
  );
};

export default Dashboard;
