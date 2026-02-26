import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, Inbox, X, ChevronDown, BarChart3 } from 'lucide-react';
import {
    getSLAAnalyticsData,
    type SLAMetrics,
    type SLATrendDataPoint,
    type SLADistribution,
    type AnalyticsFilters,
    type SLAAnalyticsData,
} from '@/services/feedbackAnalyticsService';
import { SLAKPICards } from './SLAKPICards';
import { SLAHealthIndicator } from './SLAHealthIndicator';
import { SLATrendChart } from './SLATrendChart';
import { SLADistributionCharts } from './SLADistributionCharts';
import { Skeleton } from '@/components/ui/skeleton';

const SLADashboardSkeleton = () => (
    <div className="space-y-4 animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="flex gap-3">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-8 w-40" />
            </div>
        </div>

        {/* KPIs Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
        </div>

        {/* Health Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
        </div>

        {/* Trend Skeleton */}
        <Skeleton className="h-[280px] w-full rounded-xl" />
    </div>
);

type PeriodOption = '7d' | '30d' | '90d';

export const SLAAnalyticsDashboard: React.FC = () => {
    // ─── Estados ────────────────────────────────────────────
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filtros
    const [period, setPeriod] = useState<PeriodOption>('30d');
    const [statusFilter, setStatusFilter] = useState<string>('todas');
    const [typeFilter, setTypeFilter] = useState<string>('todos');

    // Dados
    const [metrics, setMetrics] = useState<SLAMetrics | null>(null);
    const [trends, setTrends] = useState<SLATrendDataPoint[]>([]);
    const [distribution, setDistribution] = useState<SLADistribution | null>(null);

    // ─── Sync URL ───────────────────────────────────────────
    useEffect(() => {
        const params = new URLSearchParams();
        if (period !== '30d') params.set('analytics_period', period);
        if (statusFilter !== 'todas') params.set('analytics_status', statusFilter);
        if (typeFilter !== 'todos') params.set('analytics_type', typeFilter);

        const queryString = params.toString();
        const newUrl = queryString ? `?${queryString}` : window.location.pathname;
        window.history.replaceState(null, '', newUrl);
    }, [period, statusFilter, typeFilter]);

    // Ler da URL no mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlPeriod = params.get('analytics_period') as PeriodOption;
        const urlStatus = params.get('analytics_status');
        const urlType = params.get('analytics_type');

        if (urlPeriod && ['7d', '30d', '90d'].includes(urlPeriod)) setPeriod(urlPeriod);
        if (urlStatus) setStatusFilter(urlStatus);
        if (urlType) setTypeFilter(urlType);
    }, []);

    // ─── Fetch Data ─────────────────────────────────────────
    const filters = React.useMemo<AnalyticsFilters>(() => ({
        period,
        status: statusFilter !== 'todas' ? statusFilter : undefined,
        type: typeFilter !== 'todos' ? typeFilter : undefined,
    }), [period, statusFilter, typeFilter]);

    const fetchAnalytics = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data: SLAAnalyticsData = await getSLAAnalyticsData(filters);

            setMetrics(data.metrics);
            setTrends(data.trends);
            setDistribution(data.distribution);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro ao carregar analytics';
            setError(msg);
            console.error('[SLAAnalyticsDashboard] Error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    // ─── Limpar Filtros ─────────────────────────────────────
    const clearFilters = () => {
        setPeriod('30d');
        setStatusFilter('todas');
        setTypeFilter('todos');
    };

    const hasActiveFilters = period !== '30d' || statusFilter !== 'todas' || typeFilter !== 'todos';

    // ─── Estados de UI ──────────────────────────────────────
    if (isLoading && !metrics) {
        return <SLADashboardSkeleton />;
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8">
                <div className="flex flex-col items-center justify-center py-12">
                    <AlertTriangle size={32} className="mb-3 text-red-400" />
                    <p className="text-sm text-red-500 mb-3">{error}</p>
                    <button
                        onClick={fetchAnalytics}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                    >
                        Tentar Novamente
                    </button>
                </div>
            </div>
        );
    }

    if (!metrics || metrics.totalFeedbacks === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8">
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Inbox size={32} className="mb-3 opacity-40" />
                    <p className="text-sm font-medium mb-1">Sem dados suficientes para o período selecionado</p>
                    <p className="text-xs mb-3 text-center max-w-[280px]">Tente ajustar os filtros ou selecionar um período maior para ver as métricas de SLA.</p>
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="text-sm text-blue-500 hover:underline flex items-center gap-1 focus:ring-2 focus:ring-blue-500 rounded px-2"
                        >
                            <X size={14} /> Limpar Filtros
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ─── Render Principal ───────────────────────────────────
    return (
        <div className="space-y-4">
            {/* Header + Filtros */}
            <div className="glow-card p-4 sm:p-5 rounded-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BarChart3 size={20} className="text-blue-500" />
                        Analytics de SLA
                    </h2>
                </div>

                {/* Filtros */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    {/* Período */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">
                            Período:
                        </span>
                        <div className="flex gap-1">
                            {(['7d', '30d', '90d'] as PeriodOption[]).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    aria-label={`Ver últimos ${p === '7d' ? '7' : p === '30d' ? '30' : '90'} dias`}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all focus:ring-2 focus:ring-blue-500 outline-none border border-transparent ${period === p
                                        ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/20'
                                        : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground border-transparent'
                                        }`}
                                >
                                    {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Status */}
                    <div className="relative min-w-[140px] flex-1 sm:flex-none">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            aria-label="Filtrar por status do feedback"
                            className="w-full appearance-none pl-4 pr-9 py-2.5 text-sm bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-foreground"
                        >
                            <option value="todas">Status: Todas</option>
                            <option value="nova">Nova</option>
                            <option value="planejada">Planejada</option>
                            <option value="em_desenvolvimento">Em Desenvolvimento</option>
                            <option value="concluida">Concluída</option>
                            <option value="nao_planejada">Não Planejada</option>
                        </select>
                        <ChevronDown
                            size={14}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                    </div>

                    {/* Tipo */}
                    <div className="relative min-w-[140px] flex-1 sm:flex-none">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            aria-label="Filtrar por tipo de feedback"
                            className="w-full appearance-none pl-4 pr-9 py-2.5 text-sm bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-foreground"
                        >
                            <option value="todos">Tipo: Todos</option>
                            <option value="melhoria">Melhoria</option>
                            <option value="nova_funcionalidade">Nova Funcionalidade</option>
                            <option value="problema">Problema</option>
                        </select>
                        <ChevronDown
                            size={14}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                    </div>

                    <div className="flex-1" />

                    {/* Limpar Filtros */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="text-xs font-medium text-red-500 hover:text-red-600 flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity"
                        >
                            <X size={12} /> Limpar Filtros
                        </button>
                    )}
                </div>
            </div>

            {/* ── KPIs e Saúde do SLA ───────────────── */}
            <div className="flex flex-col xl:flex-row gap-4">
                {/* Saúde do SLA */}
                <div className="w-full xl:w-[35%] flex flex-col">
                    <SLAHealthIndicator
                        responseOnTimePct={metrics.responseOnTimePct}
                        resolutionOnTimePct={metrics.resolutionOnTimePct}
                    />
                </div>

                {/* KPIs */}
                <div className="w-full xl:w-[65%] flex flex-col">
                    <SLAKPICards
                        totalFeedbacks={metrics.totalFeedbacks}
                        responseOnTimePct={metrics.responseOnTimePct}
                        resolutionOnTimePct={metrics.resolutionOnTimePct}
                        avgFirstResponseHours={metrics.avgFirstResponseHours}
                        avgResolutionDays={metrics.avgResolutionDays}
                        breachedPct={metrics.breachedPct}
                    />
                </div>
            </div>

            {/* Gráfico de Tendência */}
            <SLATrendChart data={trends} />

            {/* Distribuições */}
            {distribution && (
                <SLADistributionCharts byStatus={distribution.byStatus} byType={distribution.byType} />
            )}
        </div>
    );
};
