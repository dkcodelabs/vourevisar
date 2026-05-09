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
import { Plus, Target, Clock, Zap, ArrowRight, BookOpen, Sparkles, Flame } from 'lucide-react';
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
import { DifficultyEvolutionWidget } from '@/components/dashboard-v2/DifficultyEvolutionWidget';
import { ConsistencyCalendar } from '@/components/dashboard-v2/ConsistencyCalendar';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useDynamicCapacity } from '@/hooks/useDynamicCapacity';
import { useRealStatistics } from '@/hooks/useRealStatistics';
import { StreakCalendarModal } from '@/components/dashboard/StreakCalendarModal';
import { useEditalOriginsWithMerge } from '@/hooks/useEditalOriginsWithMerge';
import { useMergeData } from '@/hooks/useMergeData';
import { useMentorInsights } from '@/hooks/useMentorInsights';
import { useUserSettings } from '@/hooks/useUserSettings';
import { StudyEmptyState } from '@/components/study/StudyEmptyState';

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

    // Mentor IA: insights derivados dos dados em memória (zero queries ao Supabase)
    const mentorInsights = useMentorInsights();
    const { getExamCountdown } = useUserSettings();
    const countdown = getExamCountdown();

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
    const { editaisData, editaisNoCiclo: activeEditais } = useEditalOriginsWithMerge();

    const hasActiveCycle = userCycle?.ciclo_atual && userCycle.ciclo_atual.length > 0;
    const hasAnyEdital = editaisData.length > 0 || subjects.length > 0;

    // Se não houver ciclo ativo, mudar o filtro para "Tudo" automaticamente para mostrar dados legados/manuais
    useEffect(() => {
        if (!cycleLoading && !hasActiveCycle && subjects.length > 0 && statsFilter.type === 'cycle') {
            setStatsFilter({ type: 'all' });
        }
    }, [cycleLoading, hasActiveCycle, subjects.length, statsFilter.type]);

    const editalDisplayName = useMemo(() => {
        if (!hasActiveCycle || !activeEditais || activeEditais.length === 0) return null;
        
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
    }, [hasActiveCycle, activeEditais]);

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

    // Lógica para o banner motivacional — mesma lógica do useReviewsData:
    // Só conta tópicos iniciados (com firstStudiedAt), com nextReview vencido ou para hoje.
    // Exclui tópicos Não Iniciados (sem firstStudiedAt) e tópicos sem nextReview.
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const { overdueReal, todayReal, futureReal } = filteredSubjects.reduce(
        (acc, subject) => {
            subject.topics.forEach(topic => {
                // Excluir: não iniciados, sem nextReview, já dominados/concluídos
                const wasStudied = !!(topic.firstStudiedAt || topic.first_studied_at);
                if (!wasStudied || !topic.nextReview || topic.is_completed) return;

                const revStr = format(new Date(topic.nextReview), 'yyyy-MM-dd');
                if (revStr < todayStr) acc.overdueReal++;
                else if (revStr === todayStr) acc.todayReal++;
                else acc.futureReal++;
            });
            return acc;
        },
        { overdueReal: 0, todayReal: 0, futureReal: 0 }
    );

    const pendingCount = overdueReal + todayReal;
    const hasPendingReviews = pendingCount > 0;
    const hasCycleTopicsToStudy = overview.completedTopics < overview.totalTopics && overview.totalTopics > 0;
    const hasFutureReviews = futureReal > 0;

    let motivBanner = {
        icon: Clock,
        iconColor: 'text-rose-500',
        iconBg: 'bg-rose-500/10',
        title: 'Foco nas Revisões',
        text: `Você tem ${pendingCount} tópico${pendingCount > 1 ? 's' : ''} aguardando. Vamos focar!`,
        btnText: 'REVISAR',
        action: '/revisoes'
    };

    if (!hasPendingReviews) {
        if (hasCycleTopicsToStudy || hasFutureReviews) {
            motivBanner = {
                icon: Zap,
                iconColor: 'text-[#44d8f1]',
                iconBg: 'bg-[#44d8f1]/10',
                title: 'Revisões em Dia',
                text: 'Tudo em dia! Avance novos tópicos do ciclo ou prepare-se para as próximas revisões.',
                btnText: 'AVANÇAR',
                action: '/ciclo-estudos'
            };
        } else {
            motivBanner = {
                icon: Sparkles,
                iconColor: 'text-emerald-500',
                iconBg: 'bg-emerald-500/10',
                title: 'Tudo Concluído',
                text: 'Incrível! Edital fechado e sem cronograma de revisões pendente.',
                btnText: 'VER PAINEL',
                action: '/revisoes'
            };
        }
    }



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

                {(!hasActiveCycle) ? (
                    <StudyEmptyState
                        kind={hasAnyEdital ? 'no-cycle' : 'no-edital'}
                        variant="center"
                        onAction={() => navigate('/meus-editais')}
                    />
                ) : (
                    <div className="space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
                        
                        <div className="flex flex-col xl:flex-row gap-6 items-stretch justify-start">
                            {/* Command Center Compacto */}
                            <div className="glow-card p-6 rounded-3xl flex flex-col justify-between h-full relative overflow-hidden group transition-transform hover:scale-[1.02] duration-300 w-full xl:w-[360px] shrink-0">
                                <div>
                                    <div className="flex flex-col mb-8">
                                        <div className="flex items-center gap-2 text-[#44d8f1] mb-2">
                                            <Target className="w-4 h-4" />
                                            <span className="text-[10px] font-bold uppercase tracking-[0.15em] font-['Inter']">CICLO ATIVO</span>
                                        </div>
                                        <div className="relative w-full">
                                            <h2 className="text-3xl font-extrabold tracking-tight mt-1 text-[#e5e2e1] font-['Manrope'] break-words leading-tight w-3/4">
                                                {editalDisplayName ? editalDisplayName.split(' • ')[0] : 'Inicie seu Ciclo'}
                                            </h2>
                                            {editalDisplayName && editalDisplayName.includes(' • ') && (
                                                <h3 className="text-xl font-bold tracking-tight text-[#e5e2e1] font-['Manrope'] break-words opacity-90 leading-tight mt-1">
                                                    {editalDisplayName.split(' • ').slice(1).join(' • ')}
                                                </h3>
                                            )}

                                            {editalDisplayName && countdown && (
                                                <div className="absolute -top-[30px] right-0 flex flex-col items-end">
                                                    <div className="text-5xl font-black leading-none text-[#ff5722] font-['Manrope']">{countdown.daysRemaining}</div>
                                                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#e4beb4] opacity-80 mt-1 font-['Inter']">
                                                        {countdown.daysRemaining === 1 ? 'DIA RESTANTE' : 'DIAS RESTANTES'}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {editalDisplayName && (
                                        <div className="flex items-center gap-2 mb-8 text-[#e4beb4]">
                                            <Sparkles className="text-[#ffb5a0] w-4 h-4 shrink-0" />
                                            <p className="text-xs leading-relaxed opacity-80 font-['Inter']">
                                                {mentorInsights.criticalAlerts.length > 0
                                                    ? `${mentorInsights.criticalAlerts.length} matéria${mentorInsights.criticalAlerts.length > 1 ? 's' : ''} com revisões críticas em atraso`
                                                    : mentorInsights.gargalos.length > 0
                                                        ? `${mentorInsights.gargalos.length} tópico${mentorInsights.gargalos.length > 1 ? 's' : ''} com retenção em queda`
                                                        : `${dashboardStats.month.activeDays} ${dashboardStats.month.activeDays === 1 ? 'dia ativo' : 'dias ativos'} de estudo este mês! Continue assim.`
                                                }
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {editalDisplayName && (
                                    <div className="space-y-3 mt-auto pt-4">
                                        <div className="h-2 w-full bg-[#353534] rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-[#ff5722] transition-all duration-1000" 
                                                style={{ width: `${Math.min(100, Math.round((dashboardStats.general.completedTopics / Math.max(1, overview.totalTopics)) * 100)) || 0}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-[#e4beb4] uppercase tracking-widest opacity-80 font-['Inter']">DOMÍNIO DO EDITAL</span>
                                            <span className="text-[10px] font-bold text-[#e5e2e1] uppercase tracking-widest font-['Inter']">
                                                {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Streak Card Separado */}
                            {editalDisplayName && (
                                <div className="glow-card p-6 rounded-3xl flex flex-col h-full relative overflow-hidden group transition-transform hover:scale-[1.02] duration-300 w-full xl:max-w-[480px]">
                                    <div className="flex justify-between items-start mb-10 gap-2 flex-wrap sm:flex-nowrap">
                                        <div>
                                            <h3 className="font-['Manrope'] text-2xl font-bold text-[#e5e2e1] mb-1">Frequência de Estudos</h3>
                                            <p className="text-sm text-[#e4beb4]">Sua constância diária</p>
                                        </div>
                                        <div className="bg-[#1c1b1b] px-4 py-2 rounded-lg flex items-center gap-2 shrink-0 border border-[#353534]/50">
                                            <Flame className="text-[#ffb5a0] w-4 h-4 fill-current" />
                                            <span className="font-bold text-[#ffb5a0] text-sm">{dashboardStats.month.activeDays} {dashboardStats.month.activeDays === 1 ? 'dia' : 'dias'} no mês</span>
                                        </div>
                                    </div>
                                    
                                    {/* Days Row */}
                                    <div className="flex justify-between items-center mb-12 flex-1">
                                        <ConsistencyCalendar reviewData={reviewData || []} daysCount={7} />
                                    </div>
                                    
                                    {/* Footer Meta - Mensagem Motivacional Contextual */}
                                    <div className="mt-auto flex justify-between items-center p-3 bg-[#0e0e0e] rounded-xl gap-3 flex-wrap sm:flex-nowrap border border-[#353534]/30 shadow-inner">
                                        <div className="flex items-center gap-2 pl-1">
                                            <div className={`p-1.5 ${motivBanner.iconBg} rounded-md shrink-0`}>
                                                <motivBanner.icon className={`${motivBanner.iconColor} w-4 h-4 pointer-events-none`} />
                                            </div>
                                            
                                            <div>
                                                <p className="text-[9px] uppercase font-bold text-[#e4beb4]/60 tracking-wider">
                                                    {motivBanner.title}
                                                </p>
                                                <p className="font-['Manrope'] text-[#e5e2e1] font-medium text-xs leading-tight">
                                                    {motivBanner.text}
                                                </p>
                                            </div>
                                        </div>
                                        <Button 
                                            onClick={() => navigate(motivBanner.action)} 
                                            className="bg-[#353534] hover:bg-[#ff5722] text-[#e5e2e1] hover:text-white font-bold px-4 py-1 rounded-full text-[10px] uppercase tracking-widest transition-all h-7 w-full sm:w-fit shrink-0 border border-[#444] hover:border-[#ff5722] shadow-sm">
                                            {motivBanner.btnText}
                                        </Button>
                                    </div>
                                </div>
                            )}
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

                        {/* Widget: Evolução Geral de Dificuldade */}
                        <DifficultyEvolutionWidget cycleId={userCycle?.id} />
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
