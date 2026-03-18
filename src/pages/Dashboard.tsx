import React, { useState, useMemo } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useApp } from '@/contexts/AppContext';
import { useCycleState } from '@/hooks/useCycleState';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Target, Clock, Zap, ArrowRight, BookOpen } from 'lucide-react';
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
import { useEditalOrigins } from '@/hooks/useEditalOrigins';

const Dashboard = () => {
    const { subjects, isDataLoaded, isLoading, error, studyProgress } = useApp();
    const { isLoading: cycleLoading, userCycle } = useCycleState();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
    
    const [statsFilter, setStatsFilter] = useState<{ type: 'all' | 'cycle' | 'edital'; id?: string }>({ type: 'cycle' });

    // Novas estatísticas reais
    const stats = useRealStatistics(statsFilter);
    const { subjectPerformance, difficultyStats, studyHabits, overview } = stats;

    // Buscar dados do edital ativo para o cabeçalho usando o hook compartilhado
    const { editaisNoCiclo: activeEditais } = useEditalOrigins();

    const editalDisplayName = useMemo(() => {
        if (!activeEditais || activeEditais.length === 0) return null;
        
        const formatEdital = (edital: { name: string; organ?: string; position?: string; year?: string }) => {
            const parts = [];
            if ('organ' in edital && edital.organ) parts.push(edital.organ);
            if ('position' in edital && edital.position) parts.push(edital.position);
            // Removido o ano conforme solicitação
            
            // Substituir hífens por bolinhas no nome se não houver partes estruturadas
            const nameFallback = edital.name ? edital.name.split('-').join(' • ') : 'Edital';
            return parts.length > 0 ? parts.join(' • ') : nameFallback;
        };

        // Se houver mais de um edital, mostramos os nomes combinados formatados com pipe
        if (activeEditais.length > 1) {
            return activeEditais.map(e => formatEdital(e)).join(' | ');
        }

        return formatEdital(activeEditais[0]);
    }, [activeEditais]);

    // 1. Foco Agora
    const worstSubject = [...subjectPerformance]
        .filter(s => s.completedTopics > 0)
        .sort((a, b) => a.completionPercentage - b.completionPercentage)[0];

    // 2. Vitórias Rápidas
    const easyTopic = (difficultyStats.easiestPendingTopics as unknown as { id: string; name: string }[])[0];

    // Buscar histórico de revisões com filtro
    const { data: reviewData } = useQuery({
        queryKey: ['dashboard-review-history', user?.id, statsFilter, userCycle?.id],
        queryFn: async () => {
            if (!user) throw new Error('User not authenticated');
            
            let query = supabase
                .from('topic_review_history')
                .select(`
                  id, topic_id, user_id, review_stage, reviewed_at, cycle_id, edital_id,
                  topics!inner (id, name, subject_id)
                `)
                .eq('user_id', user.id);

            if (statsFilter.type === 'cycle') {
                const effectiveCycleId = statsFilter.id || userCycle?.id;
                
                if (effectiveCycleId) {
                    query = query.eq('cycle_id', effectiveCycleId);
                }
            } else if (statsFilter.type === 'edital' && statsFilter.id) {
                query = query.eq('edital_id', statsFilter.id);
            }

            const response = await query.order('reviewed_at', { ascending: false });

            if (response.error) {
              console.error('Erro ao buscar histórico de revisões:', response.error);
              return [];
            }
            return response.data?.map((review) => {
                const topicData = review.topics as unknown as { name: string; subject_id: string };
                return {
                    id: review.id,
                    topic_id: review.topic_id,
                    review_stage: review.review_stage,
                    reviewed_at: review.reviewed_at,
                    topic_name: topicData?.name,
                    subject_id: topicData?.subject_id
                };
            }) || [];
        },
        enabled: !!user && (statsFilter.type !== 'cycle' || !!userCycle?.id)
    });

    // Hooks de estatísticas
    const dashboardStats = useDashboardStats(
        subjects,
        reviewData || [],
        selectedMonth
    );

    // Capacidade Dinâmica
    const dynamicCapacity = useDynamicCapacity(reviewData || [], 5);

    // 0. Filtrar matérias para o calendário e outras métricas locais
    const filteredSubjects = useMemo(() => {
        if (statsFilter.type === 'cycle' && userCycle?.ciclo_atual) {
            const cycleIds = new Set(userCycle.ciclo_atual);
            return subjects.filter(s => cycleIds.has(s.id));
        }
        return subjects;
    }, [subjects, statsFilter, userCycle]);

    const hasActiveCycle = userCycle?.ciclo_atual && userCycle.ciclo_atual.length > 0;

    if (isLoading || cycleLoading) {
        return <LoadingSpinner size="large" showText fullPage />;
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

                {!hasActiveCycle ? (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="w-24 h-24 bg-secondary dark:bg-white/5 rounded-3xl flex items-center justify-center mb-8 mx-auto -rotate-3 shadow-inner group-hover:rotate-0 transition-transform duration-500">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center shadow-sm">
                                <Target className="text-primary" size={40} />
                            </div>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight mb-4">
                            Nenhum edital carregado no ciclo
                        </h2>
                        <p className="text-base text-content-muted leading-relaxed font-medium mb-8 max-w-lg mx-auto">
                            Você precisa carregar um edital no seu ciclo de estudos para ativar o painel inteligente, receber recomendações direcionadas e ver suas estatísticas em tempo real.
                        </p>
                        <Button
                            onClick={() => navigate('/meus-editais')}
                            className="h-11 px-6 bg-emerald-500 hover:bg-emerald-600 text-white text-[12px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                        >
                            <BookOpen className="w-4 h-4" />
                            Carregar Edital
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
                        
                        {/* Integrated Command Center - V4 */}
                        <div className="bg-card rounded-3xl border border-border shadow-soft overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700">
                            <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-border">
                                
                                {/* Lado Esquerdo: Identidade do Ciclo */}
                                <div className="flex-1 p-3 md:p-4 flex flex-col justify-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0">
                                            <Target className="w-6 h-6" />
                                        </div>
                                        <div className="min-w-0">
                                            {editalDisplayName && (
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary px-2 py-0.5 bg-primary/5 rounded border border-primary/10">
                                                        Ciclo em Estudo
                                                    </span>
                                                    <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_10px_rgba(var(--success),0.4)]" />
                                                </div>
                                            )}
                                            
                                            {editalDisplayName ? (
                                                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground leading-tight truncate">
                                                    {editalDisplayName}
                                                </h1>
                                            ) : (
                                                <div className="space-y-1">
                                                    <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
                                                        Inicie seu Ciclo de Estudo agora! ✨
                                                    </h1>
                                                    <button 
                                                        onClick={() => navigate('/meus-editais')}
                                                        className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                                                    >
                                                        Carregue um edital para começar <ArrowRight className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Lado Direito: Widget de Contagem Regressiva */}
                                <div className="lg:w-[320px] bg-secondary/30 dark:bg-muted/10 p-3 md:p-4 flex flex-col justify-center items-center">
                                    <ExamCountdown 
                                        minimal 
                                        hasActiveEdital={!!editalDisplayName} 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Seção Principal de Insights (Desktop) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-8">
                            <div className="flex flex-col gap-4">
                                <GoldenHourCard studyHabits={studyHabits} />
                                <QuickWinCard easyTopic={easyTopic} />
                            </div>

                            <PendingReviewsCard
                                reviews={{
                                    overdue: dashboardStats.general.overdueCount,
                                    today: dashboardStats.general.todayReviewCount,
                                    future: dashboardStats.general.futureReviewCount
                                }}
                            />

                            <DashboardCalendar
                                subjects={filteredSubjects}
                                reviewData={reviewData}
                                onDayClick={(date) => setSelectedCalendarDate(date)}
                                onMonthChange={(date) => setSelectedMonth(date)}
                            />

                            <DashboardStatsCard
                                stats={dashboardStats}
                                selectedMonth={selectedMonth}
                            />
                        </div>

                        {/* Linha de Performance */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                            <NeedsFocusCard worstSubject={worstSubject} />
                            <ProgressConsistencyCard
                                progress={{
                                    topics: {
                                        completed: overview.completedTopics,
                                        total: overview.totalTopics,
                                        percentage: overview.overallProgress
                                    },
                                    subjects: {
                                        completed: overview.completedSubjects,
                                        total: overview.totalSubjects,
                                        percentage: overview.totalSubjects > 0 ? Math.round((overview.completedSubjects / overview.totalSubjects) * 100) : 0
                                    }
                                }}
                                activeDays={{
                                    current: dashboardStats.month.activeDays,
                                    total: dashboardStats.month.totalDaysInMonth
                                }}
                            />
                            <div className="flex flex-col gap-4">
                                <ReviewForecastCard
                                    subjects={filteredSubjects}
                                    dailyCapacity={dynamicCapacity}
                                />
                            </div>
                        </div>
                    </div>
                )}

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