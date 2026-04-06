import React, { useState, useMemo } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useApp } from '@/contexts/AppContext';
import { useCycleState } from '@/hooks/useCycleState';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { applyUnificationMap } from '@/services/cycleMergeService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Target, Clock, Zap, ArrowRight, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

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
import { useEditalOriginsWithMerge } from '@/hooks/useEditalOriginsWithMerge';
import { useMergeData } from '@/hooks/useMergeData';

const Dashboard = () => {
    const { subjects, isDataLoaded, isLoading, error, studyProgress } = useApp();
    const { isLoading: cycleLoading, userCycle } = useCycleState();
    const { dynamicUnificationMap } = useMergeData();
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
    
    const [statsFilter, setStatsFilter] = useState<{ type: 'all' | 'cycle' | 'edital'; id?: string }>({ type: 'cycle' });

    // Listener para eventos globais no Dashboard
    useEffect(() => {
        const handleRefresh = () => {
            console.log('[Dashboard] Evento de atualização recebido, invalidando queries...');
            queryClient.invalidateQueries({ queryKey: ['dashboard-review-history'] });
        };

        window.addEventListener('cycleUpdated', handleRefresh);
        window.addEventListener('mergeUpdated', handleRefresh);

        return () => {
            window.removeEventListener('cycleUpdated', handleRefresh);
            window.removeEventListener('mergeUpdated', handleRefresh);
        };
    }, [queryClient]);

    // Novas estatísticas reais
    const stats = useRealStatistics(statsFilter);
    const { subjectPerformance, difficultyStats, studyHabits, overview } = stats;

    // Buscar dados do edital ativo para o cabeçalho usando o hook compartilhado
    const { editaisNoCiclo: activeEditais } = useEditalOriginsWithMerge();

    const hasActiveCycle = userCycle?.ciclo_atual && userCycle.ciclo_atual.length > 0;

    // Se não houver ciclo ativo, mudar o filtro para "Tudo" automaticamente para mostrar dados legados/manuais
    useEffect(() => {
        if (!cycleLoading && !hasActiveCycle && subjects.length > 0 && statsFilter.type === 'cycle') {
            setStatsFilter({ type: 'all' });
        }
    }, [cycleLoading, hasActiveCycle, subjects.length, statsFilter.type]);

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
            const cycleSubjects = subjects.filter(s => cycleIds.has(s.id));
            // Apply visual unification map so duplicate subjects appear as one
            return applyUnificationMap(cycleSubjects, dynamicUnificationMap);
        }
        return subjects;
    }, [subjects, statsFilter, userCycle?.ciclo_atual, dynamicUnificationMap]);



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

                {(!hasActiveCycle && subjects.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-500">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                            <Target className="text-primary w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground mb-2">
                            Nenhum edital carregado
                        </h2>
                        <p className="text-sm text-content-muted mb-6 max-w-md">
                            Carregue um edital para ativar o painel e ver suas estatísticas.
                        </p>
                        <Button
                            onClick={() => navigate('/meus-editais')}
                            className="h-10 px-5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center gap-2"
                        >
                            <BookOpen className="w-4 h-4" />
                            Carregar Edital
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
                        
                        {/* Command Center Compacto */}
                        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-4 animate-in fade-in duration-500">
                            <div className="flex items-center justify-between gap-4">
                                {/* Esquerda: Identidade */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <Target className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        {editalDisplayName && (
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-primary">
                                                    Ciclo ativo
                                                </span>
                                                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                            </div>
                                        )}
                                        {editalDisplayName ? (
                                            <h1 className="text-base font-bold tracking-tight text-foreground truncate">
                                                {editalDisplayName}
                                            </h1>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <h1 className="text-sm font-bold text-foreground">
                                                    Inicie seu Ciclo de Estudo
                                                </h1>
                                                <button 
                                                    onClick={() => navigate('/meus-editais')}
                                                    className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                                                >
                                                    Carregar edital <ArrowRight className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Direita: Contagem Regressiva */}
                                <div className="shrink-0">
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