import React, { useState } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useApp } from '@/contexts/AppContext';
import { useCycleState } from '@/hooks/useCycleState';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Novos componentes V2
import { DashboardHeader } from '@/components/dashboard-v2/DashboardHeader';
import { KeyMetricsGrid } from '@/components/dashboard-v2/KeyMetricsGrid';
import { DashboardCalendar } from '@/components/dashboard-v2/DashboardCalendar';
import { DashboardStatsCard } from '@/components/dashboard-v2/DashboardStatsCard';
import { DashboardInsights } from '@/components/dashboard-v2/DashboardInsights';
import { ReviewByTypeCard } from '@/components/dashboard-v2/ReviewByTypeCard';
import { ReviewForecastCard } from '@/components/dashboard-v2/ReviewForecastCard';

import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useDynamicCapacity } from '@/hooks/useDynamicCapacity';
import { StreakCalendarModal } from '@/components/dashboard/StreakCalendarModal';

const Dashboard = () => {
  const { subjects, isDataLoaded, isLoading, error } = useApp();
  const { isLoading: cycleLoading } = useCycleState();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);

  // Buscar histórico de revisões (Mantido do original)
  const { data: reviewData } = useQuery({
    queryKey: ['dashboard-review-history', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id')
        .eq('user_id', user.id);

      if (subjectsError) throw subjectsError;
      if (!subjectsData || subjectsData.length === 0) return [];

      const userSubjectIds = subjectsData.map(s => s.id);

      // @ts-ignore - tabela existente no banco
      const response = await (supabase as any)
        .from('topic_review_history')
        .select(`
          id, topic_id, review_stage, reviewed_at,
          topics!inner (id, name, subject_id)
        `)
        .in('topics.subject_id', userSubjectIds)
        .order('reviewed_at', { ascending: false });

      if (response.error) throw response.error;
      return response.data?.map((review: any) => ({
        id: review.id,
        topic_id: review.topic_id,
        review_stage: review.review_stage,
        reviewed_at: review.reviewed_at,
        topic_name: review.topics?.name,
        subject_id: review.topics?.subject_id
      })) || [];
    },
    enabled: !!user
  });

  // Hooks de estatísticas
  const dashboardStats = useDashboardStats(
    subjects,
    reviewData || []
  );

  // Capacidade Dinâmica (Baseada no histórico)
  const dynamicCapacity = useDynamicCapacity(reviewData || [], 5);

  // Cálculos para cards do topo (KeyMetrics)
  const totalTopics = subjects.reduce((total, subject) => total + subject.topics.length, 0);
  const completedTopics = subjects.reduce((total, subject) =>
    total + subject.topics.filter(topic => topic.reviewStage === 'Concluído').length, 0
  );
  const progressPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  // Cálculo de Matérias Concluídas (Considerando concluída se todos os tópicos estiverem concluídos)
  const totalSubjects = subjects.length;
  const completedSubjects = subjects.filter(subject =>
    subject.topics.length > 0 && subject.topics.every(topic => topic.reviewStage === 'Concluído')
  ).length;
  const subjectProgressPercentage = totalSubjects > 0 ? Math.round((completedSubjects / totalSubjects) * 100) : 0;

  // Calculo simples de streak (pode ser melhorado com useAdvancedStatistics se necessário)
  // Por enquanto, usando activeDays do mês como proxy ou 0
  const currentStreak = dashboardStats.general.totalActiveDays > 0 ? dashboardStats.month.activeDays : 0;

  if (isLoading || cycleLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="text-center border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-600">Erro ao carregar dados</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">

        <DashboardHeader subjectsCount={subjects.length} />

        {subjects.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 md:p-16 shadow-sm border border-slate-100 dark:border-slate-800 text-center max-w-4xl mx-auto mt-6 animate-in fade-in zoom-in duration-500">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white mb-3">Comece sua jornada!</h2>
            <p className="text-base text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
              Adicione suas primeiras matérias para desbloquear o painel de estatísticas.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                onClick={() => navigate('/materias')}
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-12 rounded-xl shadow-md hover:shadow-lg transition-all group font-semibold"
              >
                <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform" />
                Adicionar Matéria
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">

            {/* 1. Métricas Vitais do Topo */}
            <KeyMetricsGrid
              reviews={{
                overdue: dashboardStats.general.overdueCount,
                today: dashboardStats.general.todayReviewCount,
                future: dashboardStats.general.futureReviewCount
              }}
              progress={{
                topics: { completed: completedTopics, total: totalTopics, percentage: progressPercentage },
                subjects: { completed: completedSubjects, total: totalSubjects, percentage: subjectProgressPercentage }
              }}
              activeDays={{ current: dashboardStats.month.activeDays, total: dashboardStats.month.totalDaysInMonth }}
            />

            {/* 2. Insights Rápidos (New Section) */}
            <DashboardInsights />

            {/* 3. Área Principal: Calendário e Estatísticas */}
            {/* 3. Área Principal: Calendário e Estatísticas */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr,1fr] gap-6 items-start">
              {/* Coluna Principal (Esquerda) */}
              <div className="h-full">
                <ReviewForecastCard
                  subjects={subjects}
                  dailyCapacity={dynamicCapacity}
                  className="h-full min-h-[500px]"
                />
              </div>

              {/* Coluna Lateral (Direita) */}
              <div className="flex flex-col gap-6">
                <DashboardCalendar
                  subjects={subjects}
                  reviewData={reviewData}
                  onDayClick={(date) => setSelectedCalendarDate(date)}
                  className="min-h-[400px]"
                />
                <DashboardStatsCard
                  stats={dashboardStats}
                  className="min-h-[400px]"
                />
                <ReviewByTypeCard subjects={subjects} />
              </div>
            </div>

            {/* Breve espaçamento final */}
            <div className="h-8"></div>
          </div>
        )}

        {/* Modals Utilitários */}
        <StreakCalendarModal
          isOpen={!!selectedCalendarDate}
          onClose={() => setSelectedCalendarDate(null)}
          subjects={subjects}
          selectedDate={selectedCalendarDate || undefined}
          reviewData={reviewData || []}
        />
      </div>
    </div>
  );
};

export default Dashboard;