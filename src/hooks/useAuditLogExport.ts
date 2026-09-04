import { useCallback, useState } from 'react';
import { withTimeout } from '@/utils/withTimeout';
import { invokeAdminRpc } from '@/services/adminRpcService';
import { downloadAuditLogsCsv } from '@/utils/auditLogExport';

type AuditLogExportRow = Parameters<typeof downloadAuditLogsCsv>[0][number] & { total_count: number };

export const useAuditLogExport = ({
    eventLabels, eventType, getDateRange, actorUserId, targetUserId, status,
}: {
    eventLabels: Record<string, string>;
    eventType: string;
    getDateRange: () => { startDate: Date | null; endDate: Date | null };
    actorUserId: string;
    targetUserId: string;
    status: string;
}) => {
    const [exporting, setExporting] = useState(false);
    const handleExport = useCallback(async () => {
        setExporting(true);
        try {
            const { startDate, endDate } = getDateRange();
            const data = await withTimeout(invokeAdminRpc<AuditLogExportRow[]>('get_audit_logs', {
                p_limit: 10000, p_offset: 0, p_event_type: eventType || null, p_target_user_id: targetUserId || null,
                p_actor_user_id: actorUserId || null, p_status: status || null,
                p_start_date: startDate?.toISOString() || null, p_end_date: endDate?.toISOString() || null,
            }), 12000, 'Exportação da auditoria');
            if (data?.length) downloadAuditLogsCsv(data, eventLabels);
        } catch (error) {
            console.error('Export error:', error);
        } finally {
            setExporting(false);
        }
    }, [actorUserId, eventLabels, eventType, getDateRange, status, targetUserId]);
    return { exporting, handleExport };
};
