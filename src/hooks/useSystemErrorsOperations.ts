import { useCallback, useState } from 'react';
import { acknowledgeAdminAlert, fetchActiveAdminAlerts, updateAdminErrorStatus } from '@/services/adminSystemErrorsService';
import type { AlertEvent, ErrorStatus, SLOMetrics } from '@/lib/errors/types';
import { invokeAdminRpc } from '@/services/adminRpcService';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';

export const useSystemErrorsOperations = ({ fetchErrors, selectedIds, clearSelection }: { fetchErrors: () => void; selectedIds: Set<string>; clearSelection: () => void }) => {
    const [sloMetrics, setSloMetrics] = useState<SLOMetrics | null>(null);
    const [activeAlerts, setActiveAlerts] = useState<AlertEvent[]>([]);
    const fetchOperationalData = useCallback(async () => {
        const sloData = await invokeAdminRpc<SLOMetrics>('calculate_slo_metrics', { p_days_window: 7 });
        if (sloData) setSloMetrics(sloData);
        await invokeAdminRpc('check_error_alerts');
        setActiveAlerts(await fetchActiveAdminAlerts());
    }, []);

    const executeBatchAction = useCallback(async (action: 'resolve' | 'investigate' | 'ignore') => {
        if (!window.confirm(`Aplicar ação "${action}" em ${selectedIds.size} itens?`)) return;
        const newStatus: ErrorStatus = action === 'resolve' ? 'resolved' : action === 'investigate' ? 'investigating' : 'ignored';
        const ids = Array.from(selectedIds);
        try {
            await updateAdminErrorStatus(ids, newStatus);
            toast.success(`${ids.length} itens atualizados para ${newStatus}.`);
            clearSelection();
            fetchErrors();
        } catch {
            toastGate.notifyError('Falha na ação em lote.', 'SYS-BATCH-ERR', { severity: 'medium', flowKey: 'sys-batch' });
        }
    }, [clearSelection, fetchErrors, selectedIds]);

    return { activeAlerts, executeBatchAction, fetchOperationalData, sloMetrics };
};
