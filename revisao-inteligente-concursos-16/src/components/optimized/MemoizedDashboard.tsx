import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, TrendingUp, Plus, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Subject } from '@/types';
import { useMemoizedDashboardStats } from '@/hooks/useMemoizedCalculations';

interface MemoizedDashboardProps {
  subjects: Subject[];
  isDataLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

const MemoizedDashboard = memo<MemoizedDashboardProps>(({ 
  subjects, 
  isDataLoaded, 
  isLoading, 
  error 
}) => {
  const navigate = useNavigate();
  const { overdueCount, todayCount, totalTopics, completedTopics, progressPercentage } = 
    useMemoizedDashboardStats(subjects);

  // Memoizar cards de estatísticas
  const statsCards = useMemo(() => [
    {
      title: "Revisões Atrasadas",
      value: overdueCount,
      description: "Tópicos que precisam de atenção",
      icon: <Flame className="h-4 w-4" />,
      color: overdueCount > 0 ? "text-red-600" : "text-gray-600",
      onClick: () => navigate('/revisoes?tab=hoje')
    },
    {
      title: "Revisões de Hoje",
      value: todayCount,
      description: "Tópicos para revisar hoje",
      icon: <BookOpen className="h-4 w-4" />,
      color: "text-blue-600",
      onClick: () => navigate('/revisoes?tab=hoje')
    },
    {
      title: "Progresso Geral",
      value: `${progressPercentage}%`,
      description: `${completedTopics}/${totalTopics} tópicos concluídos`,
      icon: <TrendingUp className="h-4 w-4" />,
      color: "text-green-600",
      onClick: () => navigate('/estatisticas')
    }
  ], [overdueCount, todayCount, progressPercentage, completedTopics, totalTopics, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-300" />
      </div>
    );
  }

  if (error) {
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

  if (!isDataLoaded || subjects.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card className="text-center">
          <CardHeader>
            <CardTitle>Bem-vindo ao Sistema de Revisão Inteligente!</CardTitle>
            <CardDescription>
              Comece criando suas primeiras matérias de estudo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/materias')} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeira Matéria
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do seu progresso de estudos
          </p>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        {statsCards.map((card, index) => (
          <Card 
            key={index}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={card.onClick}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={card.color}>
                {card.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.color}`}>
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ações Rápidas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Button 
          variant="outline" 
          className="h-20 flex-col gap-2"
          onClick={() => navigate('/plano-estudos')}
        >
          <BookOpen className="h-6 w-6" />
          Plano de Estudos
        </Button>
        <Button 
          variant="outline" 
          className="h-20 flex-col gap-2"
          onClick={() => navigate('/revisoes')}
        >
          <TrendingUp className="h-6 w-6" />
          Revisões
        </Button>
        <Button 
          variant="outline" 
          className="h-20 flex-col gap-2"
          onClick={() => navigate('/questoes')}
        >
          <Plus className="h-6 w-6" />
          Questões
        </Button>
        <Button 
          variant="outline" 
          className="h-20 flex-col gap-2"
          onClick={() => navigate('/materias')}
        >
          <BookOpen className="h-6 w-6" />
          Matérias
        </Button>
      </div>
    </div>
  );
});

MemoizedDashboard.displayName = 'MemoizedDashboard';

export default MemoizedDashboard;