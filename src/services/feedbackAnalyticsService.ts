import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, differenceInHours, differenceInDays } from 'date-fns';

// ─── Types ──────────────────────────────────────────────────

export interface SLAMetrics {
    totalFeedbacks: number;
    responseOnTimePct: number;
    resolutionOnTimePct: number;
    avgFirstResponseHours: number;
    avgResolutionDays: number;
    breachedPct: number;
}

export interface SLATrendDataPoint {
    date: string;
    displayDate: string;
    created: number;
    respondedOnTime: number;
    resolvedOnTime: number;
    breached: number;
}

export interface SLADistribution {
    byStatus: Record<string, number>;
    byType: Record<string, number>;
}

export interface AnalyticsFilters {
    period?: '7d' | '30d' | '90d';
    status?: string;
    type?: string;
}

export interface SLAAnalyticsData {
    metrics: SLAMetrics;
    trends: SLATrendDataPoint[];
    distribution: SLADistribution;
}

interface FeedbackRecord {
    id: string;
    type: string;
    status: string;
    created_at: string;
    first_response_at: string | null;
    resolved_at: string | null;
    sla_first_response_due_at: string | null;
    sla_resolution_due_at: string | null;
    sla_breached_first_response: boolean | null;
    sla_breached_resolution: boolean | null;
}

// ─── Cache ──────────────────────────────────────────────────
let analyticsCache = new Map<string, { data: SLAAnalyticsData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function _clearAnalyticsCache() {
    analyticsCache = new Map();
}

// ─── Helper Functions ───────────────────────────────────────

function getPeriodDates(period: '7d' | '30d' | '90d' = '30d'): { start: Date; end: Date } {
    const end = new Date();
    let days = 30;

    if (period === '7d') days = 7;
    else if (period === '90d') days = 90;

    const start = subDays(end, days);
    return { start: startOfDay(start), end };
}

// ─── Main Analytics Functions ──────────────────────────────

/**
 * Função centralizada para buscar todos os dados de analytics em uma única query.
 * Melhora performance e consistência dos dados.
 */
export async function getSLAAnalyticsData(filters: AnalyticsFilters = {}): Promise<SLAAnalyticsData> {
    const cacheKey = JSON.stringify(filters);
    const cached = analyticsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    try {
        const period = filters.period || '30d';
        const { start: startDate, end: endDate } = getPeriodDates(period);
        const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;

        // Query única para todos os feedbacks do período
        let query = supabase
            .from('user_feedback_events')
            .select('*')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        // Filtros globais (exceto para distribuição que deve ser sempre global ao período)
        if (filters.status && filters.status !== 'todas') {
            query = query.eq('status', filters.status);
        }
        if (filters.type && filters.type !== 'todos') {
            query = query.eq('type', filters.type);
        }

        const { data, error } = await query;
        if (error) throw error;

        const feedbacks = (data || []) as FeedbackRecord[];
        const total = feedbacks.length;

        // ─── 1. Calcular Métricas Agregadas ──────────────────
        let responseOnTime = 0;
        let resolutionOnTime = 0;
        let totalResponseTime = 0;
        let totalResolutionTime = 0;
        let responseCount = 0;
        let resolutionCount = 0;
        let breachedCount = 0;

        feedbacks.forEach((fb) => {
            const createdAt = fb.created_at ? new Date(fb.created_at) : null;
            if (!createdAt) return;

            // Response SLA
            if (fb.first_response_at) {
                responseCount++;
                const firstResponseAt = new Date(fb.first_response_at);
                const responseTime = differenceInHours(firstResponseAt, createdAt);
                totalResponseTime += Math.max(0, responseTime); // Evitar tempos negativos por drift de clock

                if (!fb.sla_breached_first_response) {
                    responseOnTime++;
                }
            }

            // Resolution SLA
            if (fb.resolved_at) {
                resolutionCount++;
                const resolvedAt = new Date(fb.resolved_at);
                const resolutionTime = differenceInDays(resolvedAt, createdAt);
                totalResolutionTime += Math.max(0, resolutionTime);

                if (!fb.sla_breached_resolution) {
                    resolutionOnTime++;
                }
            }

            // Breached
            if (fb.sla_breached_first_response || fb.sla_breached_resolution) {
                breachedCount++;
            }
        });

        const metrics: SLAMetrics = {
            totalFeedbacks: total,
            responseOnTimePct: responseCount > 0 ? (responseOnTime / responseCount) * 100 : 0,
            resolutionOnTimePct: resolutionCount > 0 ? (resolutionOnTime / resolutionCount) * 100 : 0,
            avgFirstResponseHours: responseCount > 0 ? totalResponseTime / responseCount : 0,
            avgResolutionDays: resolutionCount > 0 ? totalResolutionTime / resolutionCount : 0,
            breachedPct: total > 0 ? (breachedCount / total) * 100 : 0,
        };

        // ─── 2. Calcular Tendências Temporais ───────────────
        const trends: SLATrendDataPoint[] = [];
        const today = startOfDay(new Date());

        for (let i = days - 1; i >= 0; i--) {
            const date = subDays(today, i);
            const dateStr = date.toISOString().split('T')[0];
            const displayDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);

            const dayFeedbacks = feedbacks.filter((fb) => {
                if (!fb.created_at) return false;
                return fb.created_at.startsWith(dateStr);
            });

            const created = dayFeedbacks.length;

            const respondedOnTime = dayFeedbacks.filter((fb) =>
                fb.first_response_at && !fb.sla_breached_first_response && fb.first_response_at.startsWith(dateStr)
            ).length;

            const resolvedOnTime = dayFeedbacks.filter((fb) =>
                fb.resolved_at && !fb.sla_breached_resolution && fb.resolved_at.startsWith(dateStr)
            ).length;

            const breached = dayFeedbacks.filter(
                (fb) => fb.sla_breached_first_response || fb.sla_breached_resolution
            ).length;

            trends.push({
                date: dateStr,
                displayDate,
                created,
                respondedOnTime,
                resolvedOnTime,
                breached,
            });
        }

        // ─── 3. Calcular Distribuições ──────────────────────
        // Se houver filtros, a distribuição deve refletir o set filtrado
        const byStatus: Record<string, number> = {};
        const byType: Record<string, number> = {};

        feedbacks.forEach((fb) => {
            if (fb.status) byStatus[fb.status] = (byStatus[fb.status] || 0) + 1;
            if (fb.type) byType[fb.type] = (byType[fb.type] || 0) + 1;
        });

        const resultData = {
            metrics,
            trends,
            distribution: { byStatus, byType }
        };

        analyticsCache.set(cacheKey, { data: resultData, timestamp: Date.now() });

        return resultData;
    } catch (err) {
        console.error('[feedbackAnalyticsService] Error in getSLAAnalyticsData:', err);
        // Fallback estruturado em caso de erro
        return {
            metrics: { totalFeedbacks: 0, responseOnTimePct: 0, resolutionOnTimePct: 0, avgFirstResponseHours: 0, avgResolutionDays: 0, breachedPct: 0 },
            trends: [],
            distribution: { byStatus: {}, byType: {} }
        };
    }
}

// ─── End of Service ─────────────────────────────────────────
