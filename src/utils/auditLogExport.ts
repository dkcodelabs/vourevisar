import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ExportableAuditLog = {
    occurred_at: string;
    event_type: string;
    target_user_name: string;
    target_user_email: string;
    target_user_id: string;
    actor_user_id: string;
    actor_user_name: string;
    actor_user_email: string;
    origin?: string;
    status: string;
};

export const downloadAuditLogsCsv = (logs: ExportableAuditLog[], eventLabels: Record<string, string>) => {
    const headers = ['Data/Hora', 'Evento', 'Alvo Nome', 'Alvo Email', 'Alvo ID', 'Ator Nome', 'Ator Email', 'Ator ID', 'Origem', 'status_code', 'status_label'];
    const rows = logs.map(log => [
        format(new Date(log.occurred_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
        eventLabels[log.event_type] || log.event_type,
        log.target_user_name || 'N/A', log.target_user_email || 'N/A', log.target_user_id || 'N/A',
        log.actor_user_id ? (log.actor_user_name || 'N/A') : 'Sistema (automático)',
        log.actor_user_id ? (log.actor_user_email || 'N/A') : '-', log.actor_user_id || '-',
        log.origin || 'N/A', log.status, log.status === 'SUCCESS' ? 'Sucesso' : 'Falha',
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};
