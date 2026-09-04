import { useCallback, useState } from 'react';
import { fetchAdminAiUsageLogs, fetchAiDailyBudget, type AdminAiUsageLog } from '@/services/adminAiUsageService';

export const useAuditLogAiUsage = () => {
    const [aiLogs, setAiLogs] = useState<AdminAiUsageLog[]>([]);
    const [loadingAi, setLoadingAi] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiStats, setAiStats] = useState({ todayCost: 0, dailyBudget: 5, todayCount: 0, failedCount: 0 });

    const fetchAiLogs = useCallback(async () => {
        setLoadingAi(true);
        setAiError(null);
        try {
            const mappedLogs = await fetchAdminAiUsageLogs();
            setAiLogs(mappedLogs);
            const todayStart = new Date(`${new Date().toISOString().split('T')[0]}T00:00:00.000Z`);
            const todayLogs = mappedLogs.filter(log => new Date(log.created_at) >= todayStart);
            const dailyBudget = await fetchAiDailyBudget();
            setAiStats({
                todayCost: todayLogs.reduce((total, log) => total + Number(log.cost_estimate || 0), 0),
                dailyBudget,
                todayCount: todayLogs.length,
                failedCount: todayLogs.filter(log => log.status === 'failed').length,
            });
        } catch (error: unknown) {
            console.error('Error fetching AI usage logs:', error);
            setAiError(error instanceof Error ? error.message : 'A tabela de logs de IA não foi localizada. Certifique-se de que a migração SQL foi instalada no seu banco.');
        } finally {
            setLoadingAi(false);
        }
    }, []);

    return { aiError, aiLogs, aiStats, fetchAiLogs, loadingAi };
};
