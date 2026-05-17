import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
    Loader2, Search, Download, Calendar, Filter, ChevronLeft, ChevronRight,
    Activity, LogIn, LogOut, Slash, UserCog, KeyRound, Mail, UserCheck,
    CheckCircle, XCircle, X, Eye, User, RefreshCw
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PageContainer from '@/components/layout/PageContainer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { withTimeout } from '@/utils/withTimeout';

// Types
interface AuditLog {
    id: number;
    event_type: string;
    occurred_at: string;
    target_user_id: string;
    target_user_name: string;
    target_user_email: string;
    actor_user_id: string;
    actor_user_name: string;
    actor_user_email: string;
    source: string;
    origin?: string;
    status: string;
    metadata: Record<string, unknown> | null;
    total_count: number;
}

// Constants
const PAGE_SIZE = 25;

const EVENT_TYPES = [
    'LOGIN', 'LOGOUT', 'SESSION_START',
    'ACCOUNT_DEACTIVATED', 'ACCOUNT_REACTIVATED',
    'ROLE_CHANGED', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_SUCCESS',
    'EMAIL_CHANGED', 'PROFILE_UPDATED', 'EMAIL_CONFIRMED'
];

const PERIOD_OPTIONS = [
    { label: 'Hoje', value: 'today' },
    { label: '7 dias', value: '7days' },
    { label: '30 dias', value: '30days' },
    { label: '90 dias', value: '90days' },
    { label: 'Personalizado', value: 'custom' }
];

const EVENT_ICONS: Record<string, React.ReactNode> = {
    'LOGIN': <LogIn className="w-4 h-4" />,
    'LOGOUT': <LogOut className="w-4 h-4" />,
    'SESSION_START': <Activity className="w-4 h-4" />,
    'ACCOUNT_DEACTIVATED': <Slash className="w-4 h-4" />,
    'ACCOUNT_REACTIVATED': <UserCheck className="w-4 h-4" />,
    'ROLE_CHANGED': <UserCog className="w-4 h-4" />,
    'PASSWORD_RESET_REQUEST': <KeyRound className="w-4 h-4" />,
    'PASSWORD_RESET_SUCCESS': <KeyRound className="w-4 h-4" />,
    'EMAIL_CHANGED': <Mail className="w-4 h-4" />,
    'PROFILE_UPDATED': <UserCog className="w-4 h-4" />,
    'EMAIL_CONFIRMED': <Mail className="w-4 h-4" />
};

const EVENT_LABELS: Record<string, string> = {
    'LOGIN': 'Login',
    'LOGOUT': 'Logout',
    'SESSION_START': 'Sessão iniciada',
    'ACCOUNT_DEACTIVATED': 'Conta desativada',
    'ACCOUNT_REACTIVATED': 'Conta reativada',
    'ROLE_CHANGED': 'Papel alterado',
    'PASSWORD_RESET_REQUEST': 'Solicitação reset senha',
    'PASSWORD_RESET_SUCCESS': 'Senha redefinida',
    'EMAIL_CHANGED': 'Email alterado',
    'PROFILE_UPDATED': 'Perfil atualizado',
    'EMAIL_CONFIRMED': 'Email confirmado'
};

const SEVERITY_COLORS: Record<string, string> = {
    'LOGIN': 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
    'LOGOUT': 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-500/10',
    'SESSION_START': 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10',
    'ACCOUNT_DEACTIVATED': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10',
    'ACCOUNT_REACTIVATED': 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
    'ROLE_CHANGED': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
    'PASSWORD_RESET_REQUEST': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
    'PASSWORD_RESET_SUCCESS': 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
    'EMAIL_CHANGED': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
    'PROFILE_UPDATED': 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-500/10',
    'EMAIL_CONFIRMED': 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
};

export default function AuditLogs() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // State
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [exporting, setExporting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Filters
    const [period, setPeriod] = useState(searchParams.get('period') || '7days');
    const [eventType, setEventType] = useState(searchParams.get('type') || '');
    const [targetUserId, setTargetUserId] = useState(searchParams.get('target') || '');
    const [actorUserId, setActorUserId] = useState(searchParams.get('actor') || '');
    const [status, setStatus] = useState(searchParams.get('status') || '');
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    // Calculate date range based on period
    const getDateRange = useCallback(() => {
        const now = new Date();
        let startDate: Date | null = null;
        let endDate: Date | null = endOfDay(now);

        switch (period) {
            case 'today':
                startDate = startOfDay(now);
                break;
            case '7days':
                startDate = startOfDay(subDays(now, 7));
                break;
            case '30days':
                startDate = startOfDay(subDays(now, 30));
                break;
            case '90days':
                startDate = startOfDay(subDays(now, 90));
                break;
            case 'custom':
                startDate = customStartDate ? new Date(customStartDate) : null;
                endDate = customEndDate ? endOfDay(new Date(customEndDate)) : null;
                break;
        }

        return { startDate, endDate };
    }, [period, customStartDate, customEndDate]);

    // Fetch logs
    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const { startDate, endDate } = getDateRange();
            const offset = (currentPage - 1) * PAGE_SIZE;

            const { data, error } = await withTimeout(
                supabase.rpc('get_audit_logs', {
                    p_limit: PAGE_SIZE,
                    p_offset: offset,
                    p_event_type: eventType || null,
                    p_target_user_id: targetUserId || null,
                    p_actor_user_id: actorUserId || null,
                    p_status: status || null,
                    p_start_date: startDate?.toISOString() || null,
                    p_end_date: endDate?.toISOString() || null
                }),
                12000,
                'Carregamento da auditoria'
            );

            if (error) throw error;

            if (data && data.length > 0) {
                setLogs(data);
                setTotalCount(data[0].total_count);
            } else {
                setLogs([]);
                setTotalCount(0);
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            setLogs([]);
            setTotalCount(0);
            setErrorMessage(error instanceof Error ? error.message : 'Erro ao carregar auditoria.');
        } finally {
            setLoading(false);
        }
    }, [getDateRange, currentPage, eventType, targetUserId, actorUserId, status]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Update URL params
    useEffect(() => {
        const params: Record<string, string> = {};
        if (period !== '7days') params.period = period;
        if (eventType) params.type = eventType;
        if (targetUserId) params.target = targetUserId;
        if (actorUserId) params.actor = actorUserId;
        if (status) params.status = status;
        if (searchQuery) params.q = searchQuery;
        setSearchParams(params, { replace: true });
    }, [period, eventType, targetUserId, actorUserId, status, searchQuery, setSearchParams]);

    // Export to CSV
    const handleExport = async () => {
        setExporting(true);
        try {
            const { startDate, endDate } = getDateRange();

            const { data, error } = await withTimeout(
                supabase.rpc('get_audit_logs', {
                    p_limit: 10000, // Max export
                    p_offset: 0,
                    p_event_type: eventType || null,
                    p_target_user_id: targetUserId || null,
                    p_actor_user_id: actorUserId || null,
                    p_status: status || null,
                    p_start_date: startDate?.toISOString() || null,
                    p_end_date: endDate?.toISOString() || null
                }),
                12000,
                'Exportação da auditoria'
            );

            if (error) throw error;
            if (!data || data.length === 0) return;

            // Build CSV with status_code and status_label
            const headers = [
                'Data/Hora', 'Evento',
                'Alvo Nome', 'Alvo Email', 'Alvo ID',
                'Ator Nome', 'Ator Email', 'Ator ID',
                'Origem', 'status_code', 'status_label'
            ];
            const rows = data.map((log: AuditLog) => [
                format(new Date(log.occurred_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
                EVENT_LABELS[log.event_type] || log.event_type,
                log.target_user_name || 'N/A',
                log.target_user_email || 'N/A',
                log.target_user_id || 'N/A',
                log.actor_user_id ? (log.actor_user_name || 'N/A') : 'Sistema (automático)',
                log.actor_user_id ? (log.actor_user_email || 'N/A') : '-',
                log.actor_user_id || '-',
                log.origin || 'N/A',
                log.status, // status_code: SUCCESS|FAIL
                log.status === 'SUCCESS' ? 'Sucesso' : 'Falha' // status_label: PT-BR
            ]);

            const csv = [headers, ...rows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');

            // Download
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `auditoria_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export error:', error);
        } finally {
            setExporting(false);
        }
    };

    // Reset filters
    const resetFilters = () => {
        setPeriod('7days');
        setEventType('');
        setTargetUserId('');
        setActorUserId('');
        setStatus('');
        setSearchQuery('');
        setCurrentPage(1);
    };

    // Format date for display
    const formatDateTime = (dateStr: string) => {
        return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
    };

    const formatFullDateTime = (dateStr: string) => {
        return format(new Date(dateStr), "EEEE, d 'de' MMMM 'de' yyyy 'às' HH:mm:ss", { locale: ptBR });
    };

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    if (loading) {
        return <LoadingSpinner size="large" showText fullPage />;
    }

    if (errorMessage) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="max-w-md rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center">
                    <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
                        <XCircle className="h-5 w-5" />
                    </div>
                    <h2 className="text-base font-bold text-foreground">Auditoria não carregou</h2>
                    <p className="mt-2 text-sm text-content-muted">
                        {errorMessage}
                    </p>
                    <button
                        onClick={fetchLogs}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Auditoria</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Rastreamento de ações e eventos do sistema
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchLogs}
                            disabled={loading}
                            className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Atualizar
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={exporting || logs.length === 0}
                            className="px-4 py-2 text-sm font-medium text-white bg-brand-blue hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {exporting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            Exportar CSV
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                        <Filter className="w-4 h-4" />
                        Filtros
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                        {/* Period */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Período</label>
                            <select
                                value={period}
                                onChange={(e) => { setPeriod(e.target.value); setCurrentPage(1); }}
                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                            >
                                {PERIOD_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Event Type */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Tipo de Evento</label>
                            <select
                                value={eventType}
                                onChange={(e) => { setEventType(e.target.value); setCurrentPage(1); }}
                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                            >
                                <option value="">Todos</option>
                                {EVENT_TYPES.map(type => (
                                    <option key={type} value={type}>{EVENT_LABELS[type] || type}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Status</label>
                            <select
                                value={status}
                                onChange={(e) => { setStatus(e.target.value); setCurrentPage(1); }}
                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                            >
                                <option value="">Todos</option>
                                <option value="SUCCESS">Sucesso</option>
                                <option value="FAIL">Falha</option>
                            </select>
                        </div>

                        {/* Search */}
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Buscar (ID ou Email)</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="ID do usuário ou email..."
                                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                                />
                            </div>
                        </div>

                        {/* Reset */}
                        <div className="flex items-end">
                            <button
                                onClick={resetFilters}
                                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                            >
                                Limpar filtros
                            </button>
                        </div>
                    </div>

                    {/* Custom date range */}
                    {period === 'custom' && (
                        <div className="flex items-center gap-4 pt-2 border-t border-slate-100 dark:border-white/10">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => { setCustomStartDate(e.target.value); setCurrentPage(1); }}
                                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg"
                                />
                                <span className="text-slate-400">até</span>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => { setCustomEndDate(e.target.value); setCurrentPage(1); }}
                                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Results count */}
                <div className="text-sm text-slate-500 dark:text-slate-400">
                    {totalCount > 0 ? (
                        <span>{totalCount.toLocaleString('pt-BR')} registro(s) encontrado(s)</span>
                    ) : (
                        <span>Nenhum registro encontrado</span>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                    {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <Activity className="w-12 h-12 text-slate-300 mb-3" />
                            <p className="text-sm">Nenhum evento encontrado</p>
                            <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">Data/Hora</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">Evento</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">Alvo</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">Ator</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">Origem</th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-400">Status</th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-400">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span
                                                    className="text-slate-900 dark:text-slate-200 cursor-help"
                                                    title={formatFullDateTime(log.occurred_at)}
                                                >
                                                    {formatDateTime(log.occurred_at)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${SEVERITY_COLORS[log.event_type] || 'text-slate-600 bg-slate-50'}`}>
                                                    {EVENT_ICONS[log.event_type] || <Activity className="w-3.5 h-3.5" />}
                                                    {EVENT_LABELS[log.event_type] || log.event_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {log.target_user_name || log.target_user_email ? (
                                                    <div>
                                                        <p className="text-slate-900 dark:text-slate-200 font-medium">{log.target_user_name || '-'}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{log.target_user_email}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {log.actor_user_id ? (
                                                    <div>
                                                        <p className="text-slate-900 dark:text-slate-200 font-medium">{log.actor_user_name || '-'}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{log.actor_user_email}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">Sistema</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-slate-600 dark:text-slate-400">{log.origin || '-'}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {log.status === 'SUCCESS' ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                        <CheckCircle className="w-4 h-4" />
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                                                        <XCircle className="w-4 h-4" />
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => setSelectedLog(log)}
                                                        className="p-1.5 text-slate-400 hover:text-brand-blue hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                                        title="Ver detalhes"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {log.target_user_id && (
                                                        <button
                                                            onClick={() => navigate(`/admin/users?search=${log.target_user_email}`)}
                                                            className="p-1.5 text-slate-400 hover:text-brand-blue hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                                            title="Ir para perfil"
                                                        >
                                                            <User className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                                Página {currentPage} de {totalPages}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Details Modal */}
                {selectedLog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Detalhes do Evento</h3>
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">ID</p>
                                        <p className="text-sm text-slate-900 dark:text-slate-200 font-mono">{selectedLog.id}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Status</p>
                                        <p className={`text-sm font-medium ${selectedLog.status === 'SUCCESS' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {selectedLog.status === 'SUCCESS' ? 'Sucesso' : 'Falha'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Evento</p>
                                        <p className="text-sm text-slate-900 dark:text-slate-200">{EVENT_LABELS[selectedLog.event_type] || selectedLog.event_type}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Origem</p>
                                        <p className="text-sm text-slate-900 dark:text-slate-200">{selectedLog.origin || '-'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Data/Hora</p>
                                        <p className="text-sm text-slate-900 dark:text-slate-200">{formatFullDateTime(selectedLog.occurred_at)}</p>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 dark:border-white/10 pt-4">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-2">Alvo</p>
                                    <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-3">
                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-200">{selectedLog.target_user_name || 'N/A'}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{selectedLog.target_user_email || 'N/A'}</p>
                                        <p className="text-xs text-slate-400 font-mono mt-1">{selectedLog.target_user_id || 'N/A'}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-2">Ator</p>
                                    <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-3">
                                        {selectedLog.actor_user_id ? (
                                            <>
                                                <p className="text-sm font-medium text-slate-900 dark:text-slate-200">{selectedLog.actor_user_name || 'N/A'}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedLog.actor_user_email || 'N/A'}</p>
                                                <p className="text-xs text-slate-400 font-mono mt-1">{selectedLog.actor_user_id}</p>
                                            </>
                                        ) : (
                                            <p className="text-sm text-slate-500 dark:text-slate-400 italic">Sistema (automático)</p>
                                        )}
                                    </div>
                                </div>

                                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                    <div className="border-t border-slate-100 dark:border-white/10 pt-4">
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-2">Metadados</p>

                                        {/* Critical audit fields - formatted */}
                                        <div className="space-y-2 mb-3">
                                            {(selectedLog.metadata.source || selectedLog.metadata.request_id) && (
                                                <div className="flex items-start gap-2">
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[80px]">Fonte:</span>
                                                    <span className="text-sm text-slate-900 dark:text-slate-200">
                                                        {String(selectedLog.metadata.source || selectedLog.metadata.request_id)}
                                                    </span>
                                                </div>
                                            )}
                                            {selectedLog.metadata.reason && (
                                                <div className="flex items-start gap-2">
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[80px]">Motivo:</span>
                                                    <span className="text-sm text-slate-900 dark:text-slate-200">{String(selectedLog.metadata.reason)}</span>
                                                </div>
                                            )}
                                            {selectedLog.metadata.old_role && selectedLog.metadata.new_role && (
                                                <div className="flex items-start gap-2">
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[80px]">Alteração:</span>
                                                    <span className="text-sm text-slate-900 dark:text-slate-200">
                                                        {String(selectedLog.metadata.old_role)} → {String(selectedLog.metadata.new_role)}
                                                    </span>
                                                </div>
                                            )}
                                            {selectedLog.metadata.ip && (
                                                <div className="flex items-start gap-2">
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[80px]">IP:</span>
                                                    <span className="text-sm text-slate-900 dark:text-slate-200 font-mono">{String(selectedLog.metadata.ip)}</span>
                                                </div>
                                            )}
                                            {selectedLog.metadata.user_agent && (
                                                <div className="flex items-start gap-2">
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[80px]">Navegador:</span>
                                                    <span className="text-sm text-slate-900 dark:text-slate-200 break-all">{String(selectedLog.metadata.user_agent)}</span>
                                                </div>
                                            )}
                                            {selectedLog.metadata.tz && (
                                                <div className="flex items-start gap-2">
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[80px]">Fuso:</span>
                                                    <span className="text-sm text-slate-900 dark:text-slate-200">{String(selectedLog.metadata.tz)}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Full JSON - collapsible */}
                                        <details className="group">
                                            <summary className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
                                                Ver JSON completo
                                            </summary>
                                            <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto font-mono mt-2">
                                                {JSON.stringify(selectedLog.metadata, null, 2)}
                                            </pre>
                                        </details>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
