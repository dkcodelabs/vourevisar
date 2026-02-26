import React, { useState } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
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
import { ExamCountdown } from '@/components/dashboard-v2/ExamCountdown';
import { DashboardCalendar } from '@/components/dashboard-v2/DashboardCalendar';
import { DashboardStatsCard } from '@/components/dashboard-v2/DashboardStatsCard';
import { PendingReviewsCard } from '@/components/dashboard-v2/PendingReviewsCard';
import { ProgressConsistencyCard } from '@/components/dashboard-v2/ProgressConsistencyCard';
import { NeedsFocusCard, QuickWinCard, GoldenHourCard } from '@/components/dashboard-v2/InsightCards';
import { ReviewForecastCard } from '@/components/dashboard-v2/ReviewForecastCard';

import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useDynamicCapacity } from '@/hooks/useDynamicCapacity';
import { useRealStatistics } from '@/hooks/useRealStatistics';
import { StreakCalendarModal } from '@/components/dashboard/StreakCalendarModal';

const Dashboard = () => {
    const { subjects, isDataLoaded, isLoading, error } = useApp();
    const { isLoading: cycleLoading } = useCycleState();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
    const [hour] = useState(() => new Date().getHours());

    // Novas estatísticas reais
    const { subjectPerformance, difficultyStats, studyHabits } = useRealStatistics();

    // 1. Foco Agora
    const worstSubject = [...subjectPerformance]
        .filter(s => s.completedTopics > 0)
        .sort((a, b) => a.completionPercentage - b.completionPercentage)[0];

    // 2. Vitórias Rápidas
    const easyTopic = difficultyStats.easiestPendingTopics[0];

    // Buscar histórico de revisões
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

    // Hooks de estatísticas - agora com selectedMonth
    const dashboardStats = useDashboardStats(
        subjects,
        reviewData || [],
        selectedMonth
    );

    // Capacidade Dinâmica
    const dynamicCapacity = useDynamicCapacity(reviewData || [], 5);

    // Cálculos para cards do topo
    const totalTopics = subjects.reduce((total, subject) => total + subject.topics.length, 0);
    const completedTopics = subjects.reduce((total, subject) =>
        total + subject.topics.filter(topic => topic.reviewStage === 'Concluído').length, 0
    );
    const progressPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    const totalSubjects = subjects.length;
    const completedSubjects = subjects.filter(subject =>
        subject.topics.length > 0 && subject.topics.every(topic => topic.reviewStage === 'Concluído')
    ).length;
    const subjectProgressPercentage = totalSubjects > 0 ? Math.round((completedSubjects / totalSubjects) * 100) : 0;

    const currentStreak = dashboardStats.general.totalActiveDays > 0 ? dashboardStats.month.activeDays : 0;

    if (isLoading || cycleLoading) {
        console.log('[DEBUG] Dashboard renderizando LoadingSpinner. AppContext isLoading:', isLoading, 'cycleLoading:', cycleLoading);
        return (
            <div className="w-full h-[70vh] flex flex-col items-center justify-center">
                <LoadingSpinner size="large" showText />
            </div>
        );
    }

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
        <div className="pb-10 h-full w-full">
            <div className="w-full pb-8 pt-0">

                {subjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        {/* Ícone Principal */}
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mb-8 shadow-inner">
                            <span className="text-5xl">🚀</span>
                        </div>

                        {/* Título Motivacional */}
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                            Sua Jornada de Aprovação Começa Aqui! ✨
                        </h2>

                        {/* Descrição */}
                        <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
                            Esse é o primeiro passo para transformar seus estudos. Adicione suas matérias e tópicos para começar sua preparação.
                        </p>

                        {/* Frase Motivacional com Ícone */}
                        <div className="flex items-start gap-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border border-amber-100 dark:border-amber-800/30 p-5 rounded-2xl mb-10 max-w-lg shadow-sm">
                            <span className="text-3xl flex-shrink-0">🌟</span>
                            <div className="text-left">
                                <p className="text-slate-800 dark:text-slate-200 font-semibold mb-1">
                                    Mantenha a Positividade
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Foque em pensamentos e ações que te levem ao crescimento.
                                </p>
                            </div>
                        </div>

                        {/* Texto de Ação */}
                        <p className="text-slate-500 dark:text-slate-500 mb-8 font-medium">
                            Comece agora cadastrando suas matérias e tópicos de estudo.
                        </p>

                        {/* Botão CTA */}
                        <Button
                            onClick={() => navigate('/materias')}
                            size="lg"
                            className="px-10 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 text-base"
                        >
                            <Plus className="mr-2 h-5 w-5" />
                            Começar Minha Jornada
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">

                        {/* 1. L1 - 4 Colunas Principais (Desktop) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            {/* C1: Data da Prova + Horário de Ouro */}
                            <div className="flex flex-col gap-4">
                                <ExamCountdown />
                                <GoldenHourCard studyHabits={studyHabits} />
                            </div>

                            {/* C2: Revisões Pendentes */}
                            <PendingReviewsCard
                                reviews={{
                                    overdue: dashboardStats.general.overdueCount,
                                    today: dashboardStats.general.todayReviewCount,
                                    future: dashboardStats.general.futureReviewCount
                                }}
                            />

                            {/* C3: Calendário */}
                            <DashboardCalendar
                                subjects={subjects}
                                reviewData={reviewData}
                                onDayClick={(date) => setSelectedCalendarDate(date)}
                                onMonthChange={(date) => setSelectedMonth(date)}
                            />

                            {/* C4: Estatísticas */}
                            <DashboardStatsCard
                                stats={dashboardStats}
                                selectedMonth={selectedMonth}
                            />
                        </div>

                        {/* 2. L2 - 3 Colunas Secundárias (Desktop) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* C1: Foco Necessário */}
                            <NeedsFocusCard worstSubject={worstSubject} />

                            {/* C2: Vitória Rápida */}
                            <QuickWinCard easyTopic={easyTopic} />

                            {/* C3: Progresso & Consistência */}
                            <ProgressConsistencyCard
                                progress={{
                                    topics: {
                                        completed: completedTopics,
                                        total: totalTopics,
                                        percentage: progressPercentage
                                    },
                                    subjects: {
                                        completed: completedSubjects,
                                        total: totalSubjects,
                                        percentage: subjectProgressPercentage
                                    }
                                }}
                                activeDays={{
                                    current: dashboardStats.month.activeDays,
                                    total: dashboardStats.month.totalDaysInMonth
                                }}
                            />
                        </div>

                        {/* 4. Raio-X das Revisões */}
                        <ReviewForecastCard
                            subjects={subjects}
                            dailyCapacity={dynamicCapacity}
                        />

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