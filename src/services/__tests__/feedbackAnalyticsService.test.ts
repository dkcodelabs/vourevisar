import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSLAAnalyticsData, _clearAnalyticsCache } from '../feedbackAnalyticsService';
import { supabase } from '@/integrations/supabase/client';

// Mock do Supabase de forma mais direta
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
    },
}));

describe('feedbackAnalyticsService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        _clearAnalyticsCache();
        vi.useFakeTimers();
        // Fixa a data em 13 de Fevereiro de 2026 UTC
        vi.setSystemTime(new Date('2026-02-13T12:00:00Z'));
    });

    const setupMockData = (data: unknown[]) => {
        (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve: (val: unknown) => void) => resolve({ data, error: null })
        });
    };

    it('deve retornar métricas zeradas quando não houver feedbacks', async () => {
        setupMockData([]);
        const result = await getSLAAnalyticsData({ period: '7d' });

        expect(result.metrics.totalFeedbacks).toBe(0);
        expect(result.metrics.responseOnTimePct).toBe(0);
        expect(result.trends.length).toBe(7);
    });

    it('deve calcular corretamente métricas de SLA com dados válidos', async () => {
        const today = '2026-02-13T10:00:00Z';
        const mockData = [
            {
                id: '1',
                created_at: today,
                first_response_at: today,
                resolved_at: today,
                sla_breached_first_response: false,
                sla_breached_resolution: false,
                status: 'concluida',
                type: 'problema'
            },
            {
                id: '2',
                created_at: today,
                first_response_at: today,
                resolved_at: null,
                sla_breached_first_response: true,
                sla_breached_resolution: null,
                status: 'nova',
                type: 'melhoria'
            }
        ];

        setupMockData(mockData);
        const result = await getSLAAnalyticsData({ period: '30d' });

        expect(result.metrics.totalFeedbacks).toBe(2);
        expect(result.metrics.responseOnTimePct).toBe(50);
        expect(result.metrics.breachedPct).toBe(50);
        expect(result.distribution.byStatus).toEqual({ concluida: 1, nova: 1 });
    });

    it('deve lidar com dias sem dados na tendência temporal', async () => {
        const mockData = [
            {
                id: '1',
                created_at: '2026-02-13T10:00:00Z',
                first_response_at: null,
                resolved_at: null,
                status: 'nova',
                type: 'problema'
            }
        ];

        setupMockData(mockData);
        const result = await getSLAAnalyticsData({ period: '7d' });

        expect(result.trends.length).toBe(7);
        // 2026-02-13 é hoje no mock
        const todayTrend = result.trends.find(t => t.date === '2026-02-13');
        expect(todayTrend?.created).toBe(1);
    });

    it('deve evitar NaN em percentuais quando denominadores forem zero', async () => {
        const mockData = [
            {
                id: '1',
                created_at: '2026-02-13T10:00:00Z',
                first_response_at: null,
                resolved_at: null,
                status: 'nova',
                type: 'problema'
            }
        ];

        setupMockData(mockData);
        const result = await getSLAAnalyticsData({ period: '7d' });

        expect(result.metrics.responseOnTimePct).toBe(0);
        expect(result.metrics.resolutionOnTimePct).toBe(0);
    });
});
