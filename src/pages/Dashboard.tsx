
import React, { useState, useEffect } from 'react';
import { Book, Trophy, Calendar, TrendingUp, Clock, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GlassCard, AnimatedTitle } from '@/components/ui';
import { useCycleState } from '@/hooks/useCycleState';

interface DashboardStats {
  totalSubjects: number;
  totalTopics: number;
  completedTopics: number;
  todayReviews: number;
  overdueReviews: number;
  upcomingReviews: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { cycleState } = useCycleState();
  const [stats, setStats] = useState<DashboardStats>({
    totalSubjects: 0,
    totalTopics: 0,
    completedTopics: 0,
    todayReviews: 0,
    overdueReviews: 0,
    upcomingReviews: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Buscar estatísticas gerais
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select(`
          id,
          name,
          topics (
            id,
            name,
            completed,
            next_review,
            review_stage
          )
        `)
        .eq('user_id', user.id);

      if (subjectsError) throw subjectsError;

      const subjects = subjectsData || [];
      let totalTopics = 0;
      let completedTopics = 0;
      let todayReviews = 0;
      let overdueReviews = 0;
      let upcomingReviews = 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      subjects.forEach(subject => {
        if (subject.topics) {
          subject.topics.forEach(topic => {
            totalTopics++;
            
            if (topic.completed && (!topic.next_review || topic.review_stage === 'Concluído')) {
              completedTopics++;
            }

            if (topic.next_review) {
              const reviewDate = new Date(topic.next_review);
              reviewDate.setHours(0, 0, 0, 0);

              if (isToday(reviewDate)) {
                todayReviews++;
              } else if (isBefore(reviewDate, today)) {
                overdueReviews++;
              } else {
                upcomingReviews++;
              }
            }
          });
        }
      });

      setStats({
        totalSubjects: subjects.length,
        totalTopics,
        completedTopics,
        todayReviews,
        overdueReviews,
        upcomingReviews
      });

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const getCompletionPercentage = () => {
    if (stats.totalTopics === 0) return 0;
    return Math.round((stats.completedTopics / stats.totalTopics) * 100);
  };

  const getCyclePercentage = () => {
    if (cycleState.totalSubjects === 0) return 0;
    return Math.round((cycleState.completedSubjects / cycleState.totalSubjects) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-app-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <AnimatedTitle>Dashboard</AnimatedTitle>
        <div className="text-sm text-gray-600">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </div>
      </div>

      {/* Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Book className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total de Matérias</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSubjects}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tópicos Concluídos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedTopics}</p>
              <p className="text-xs text-gray-500">de {stats.totalTopics} total</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Revisões Hoje</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayReviews}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Trophy className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Ciclos Concluídos</p>
              <p className="text-2xl font-bold text-gray-900">{cycleState.completedCycles}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Progresso Geral e do Ciclo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Progresso Geral</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Tópicos Concluídos</span>
              <span>{getCompletionPercentage()}%</span>
            </div>
            <Progress value={getCompletionPercentage()} className="h-3" />
            <p className="text-sm text-gray-600">
              {stats.completedTopics} de {stats.totalTopics} tópicos concluídos
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="h-5 w-5 text-yellow-600" />
            <h3 className="text-lg font-semibold">Progresso do Ciclo Atual</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Disciplinas Concluídas</span>
              <span>{getCyclePercentage()}%</span>
            </div>
            <Progress value={getCyclePercentage()} className="h-3" />
            <p className="text-sm text-gray-600">
              {cycleState.completedSubjects} de {cycleState.totalSubjects} disciplinas concluídas
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Revisões */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Status das Revisões</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{stats.todayReviews}</p>
            <p className="text-sm text-blue-700">Para Hoje</p>
          </div>
          
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{stats.overdueReviews}</p>
            <p className="text-sm text-red-700">Em Atraso</p>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{stats.upcomingReviews}</p>
            <p className="text-sm text-green-700">Futuras</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default Dashboard;
