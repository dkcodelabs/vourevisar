import React, { useState } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useApp } from '@/contexts/AppContext';
import { useCycleState } from '@/hooks/useCycleState';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ListChecks, AlertCircle, Clock, CalendarClock, CheckCircle2, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Novos componentes V2
import { DashboardHeader } from '@/components/dashboard-v2/DashboardHeader';
import { ExamCountdown } from '@/components/dashboard-v2/ExamCountdown';
import { DashboardCalendar } from '@/components/dashboard-v2/DashboardCalendar';
import { DashboardStatsCard } from '@/components/dashboard-v2/DashboardStatsCard';
import { DashboardInsights } from '@/components/dashboard-v2/DashboardInsights';
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
    const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

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
        <div className="min-h-screen bg-background pb-20">
            <div className="container mx-auto p-4 md:p-8 max-w-7xl">

                <DashboardHeader subjectsCount={subjects.length} />

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

                        {/* 1. Cards do Topo: Dias Restantes + Revisões Pendentes + Progresso */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Card 1: Dias Restantes (ExamCountdown) */}
                            <ExamCountdown />

                            {/* Card 2: Revisões Pendentes */}
                            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                <CardContent className="p-5 relative z-10 flex flex-col h-full">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revisões Pendentes</p>
                                        <div className="p-2 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl">
                                            <ListChecks className="w-5 h-5 text-orange-600" />
                                        </div>
                                    </div>

                                    {/* Main Number */}
                                    <div className="flex items-baseline gap-2 mb-4">
                                        <h3 className="text-4xl font-bold text-slate-900 dark:text-white">
                                            {dashboardStats.general.overdueCount + dashboardStats.general.todayReviewCount + dashboardStats.general.futureReviewCount}
                                        </h3>
                                        <span className="text-sm text-slate-400 font-medium">revisões</span>
                                    </div>

                                    {/* Breakdown with Icons - 3 columns */}
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        {/* Atrasadas */}
                                        <div className="flex flex-col items-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                            <AlertCircle className="w-4 h-4 text-red-500 mb-1" />
                                            <span className="text-lg font-bold text-red-600 dark:text-red-400">{dashboardStats.general.overdueCount}</span>
                                            <span className="text-[10px] text-red-500/80 font-medium uppercase tracking-wide">Atrasadas</span>
                                        </div>

                                        {/* Hoje */}
                                        <div className="flex flex-col items-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                            <Clock className="w-4 h-4 text-amber-500 mb-1" />
                                            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{dashboardStats.general.todayReviewCount}</span>
                                            <span className="text-[10px] text-amber-500/80 font-medium uppercase tracking-wide">Hoje</span>
                                        </div>

                                        {/* Futuras */}
                                        <div className="flex flex-col items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                            <CalendarClock className="w-4 h-4 text-blue-500 mb-1" />
                                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{dashboardStats.general.futureReviewCount}</span>
                                            <span className="text-[10px] text-blue-500/80 font-medium uppercase tracking-wide">Futuras</span>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mt-auto">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Progresso do dia</span>
                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                {dashboardStats.general.overdueCount + dashboardStats.general.todayReviewCount} restantes
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-500"
                                                style={{ width: `${Math.max(5, (dashboardStats.general.todayReviewCount / Math.max(1, dashboardStats.general.overdueCount + dashboardStats.general.todayReviewCount)) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Card 3: Progresso & Consistência */}
                            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                                <CardContent className="p-5 relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Progresso & Consistência</p>
                                        <div className="p-2 bg-indigo-500/10 rounded-xl">
                                            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {/* Tópicos */}
                                        <div>
                                            <div className="flex justify-between items-end mb-1">
                                                <span className="text-xs text-slate-500">Tópicos</span>
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {completedTopics}/{totalTopics}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${progressPercentage}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Matérias */}
                                        <div>
                                            <div className="flex justify-between items-end mb-1">
                                                <span className="text-xs text-slate-500">Matérias</span>
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {completedSubjects}/{totalSubjects}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-purple-500 h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${subjectProgressPercentage}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Dias de Estudo */}
                                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-2">
                                                <CalendarDays className="w-4 h-4 text-emerald-500" />
                                                <span className="text-xs text-slate-500">Dias Ativos</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {dashboardStats.month.activeDays}/{dashboardStats.month.totalDaysInMonth}
                                                </span>
                                                <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full">
                                                    {Math.round((dashboardStats.month.activeDays / dashboardStats.month.totalDaysInMonth) * 100)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* 2. Insights Rápidos */}
                        <DashboardInsights />

                        {/* 3. Calendário + Estatísticas (Lado a Lado, Sincronizados) */}
                        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr,0.8fr] gap-6 items-start">
                            {/* Calendário */}
                            <DashboardCalendar
                                subjects={subjects}
                                reviewData={reviewData}
                                onDayClick={(date) => setSelectedCalendarDate(date)}
                                onMonthChange={(date) => setSelectedMonth(date)}
                            />

                            {/* Estatísticas - Sincronizada com o mês do calendário */}
                            <DashboardStatsCard
                                stats={dashboardStats}
                                selectedMonth={selectedMonth}
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