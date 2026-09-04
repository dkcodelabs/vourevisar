import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Loader2, Search, Download, Calendar, Filter, ChevronLeft, ChevronRight,
    Activity, LogIn, LogOut, Slash, UserCog, KeyRound, Mail, UserCheck,
    CheckCircle, XCircle, X, Eye, User, RefreshCw, Zap, Sparkles, BarChart3, Clock, TrendingUp
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PageContainer from '@/components/layout/PageContainer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { withTimeout } from '@/utils/withTimeout';
import { invokeAdminRpc } from '@/services/adminRpcService';
import { useAuditLogFilters } from '@/hooks/useAuditLogFilters';
import { useAuditLogAiUsage } from '@/hooks/useAuditLogAiUsage';
import { EVENT_ICONS, EVENT_LABELS, EVENT_TYPES, PERIOD_OPTIONS, SEVERITY_COLORS, PAGE_SIZE } from '@/utils/auditLogPresentation';
import { useAuditLogExport } from '@/hooks/useAuditLogExport';
import { formatAuditLogDateTime, formatAuditLogFullDateTime } from '@/utils/auditLogDateFormatters';

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
export default function AuditLogs() {
    const navigate = useNavigate();

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const { aiError, aiLogs, aiStats, fetchAiLogs, loadingAi } = useAuditLogAiUsage();

    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const {
        actorUserId, customEndDate, customStartDate, eventType, getDateRange, period, searchQuery,
        resetFilters, setActorUserId, setCustomEndDate, setCustomStartDate, setEventType, setPeriod, setSearchQuery,
        setStatus, setTargetUserId, status, targetUserId,
    } = useAuditLogFilters();

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const { startDate, endDate } = getDateRange();
            const offset = (currentPage - 1) * PAGE_SIZE;

            const data = await withTimeout(
                invokeAdminRpc<AuditLog[]>('get_audit_logs', {
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
    const { exporting, handleExport } = useAuditLogExport({ eventLabels: EVENT_LABELS, eventType, getDateRange, actorUserId, targetUserId, status });

    const handleResetFilters = () => {
        resetFilters();
        setCurrentPage(1);
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
        <div className="p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">
            <Tabs defaultValue="system" className="w-full text-slate-900 dark:text-slate-100" onValueChange={(val) => {
                if (val === 'ai_costs') {
                    fetchAiLogs();
                } else {
                    fetchLogs();
                }
            }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-black/5 dark:border-white/5 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Painel de Auditoria</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Acompanhamento técnico, segurança operacional e custos de IA
                        </p>
                    </div>
                    <TabsList className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-lg p-1">
                        <TabsTrigger value="system" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 dark:data-[state=active]:text-white px-4 py-1.5 focus:outline-none flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                            <Activity className="w-3.5 h-3.5" />
                            Auditoria Geral
                        </TabsTrigger>
                        <TabsTrigger value="ai_costs" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 dark:data-[state=active]:text-white px-4 py-1.5 focus:outline-none flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                            Custos e Telemetria IA
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="system" className="space-y-6 outline-none border-none p-0 mt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Eventos do Sistema</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Rastreamento de ações administrativas e acessos.</p>
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

                    <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-4 space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                            <Filter className="w-4 h-4" />
                            Filtros
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
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

                            <div className="flex items-end">
                                <button
                                    onClick={handleResetFilters}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    Limpar filtros
                                </button>
                            </div>
                        </div>

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

                    <div className="text-sm text-slate-500 dark:text-slate-400">
                        {totalCount > 0 ? (
                            <span>{totalCount.toLocaleString('pt-BR')} registro(s) encontrado(s)</span>
                        ) : (
                            <span>Nenhum registro encontrado</span>
                        )}
                    </div>

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
                                                        title={formatAuditLogFullDateTime(log.occurred_at)}
                                                    >
                                                        {formatAuditLogDateTime(log.occurred_at)}
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
                                            <p className="text-sm text-slate-900 dark:text-slate-200">{formatAuditLogFullDateTime(selectedLog.occurred_at)}</p>
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
                </TabsContent>

                <TabsContent value="ai_costs" className="space-y-6 outline-none border-none p-0 mt-4">
                    {aiError ? (
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-3xl p-6 sm:p-8 text-center max-w-2xl mx-auto my-6 shadow-lg">
                            <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400">
                                <Sparkles size={24} className="animate-pulse" />
                            </div>
                            <h3 className="text-lg font-black text-amber-800 dark:text-amber-300 mb-2">Telemetria de Custos IA em Espera</h3>
                            <p className="text-xs text-amber-700 dark:text-amber-400/80 leading-relaxed mb-6">
                                A infraestrutura de dados de telemetria científica ainda não foi inicializada no banco de dados. Para ativar este painel premium e monitorar cada centavo de IA do Gemini em tempo real, execute a migração SQL ou crie a tabela rodando o script abaixo no editor SQL do painel do Supabase.
                            </p>
                            <pre className="bg-slate-950 text-slate-200 rounded-xl p-4 text-[10px] text-left font-mono overflow-x-auto max-h-[160px] select-all cursor-pointer mb-3 border border-white/5">
{`CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    mode TEXT NOT NULL,
    prompt_tokens INTEGER,
    candidates_tokens INTEGER,
    cost_estimate NUMERIC(10, 6) DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);`}
                            </pre>
                            <span className="text-[9px] text-amber-600 dark:text-amber-500 font-bold block mb-5">DICA: Clique três vezes no bloco acima para copiar o comando completo.</span>
                            <button 
                                onClick={fetchAiLogs} 
                                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 mx-auto"
                            >
                                <RefreshCw size={13} />
                                Verificar Conexão
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                                <div className="glow-card p-5 rounded-2xl border border-black/5 dark:border-white/5 bg-card flex flex-col justify-between min-h-[130px]">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold text-content-muted uppercase tracking-[0.16em]">Orçamento IA Hoje</span>
                                        <Zap size={14} className="text-amber-500" />
                                    </div>
                                    <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                                        ${aiStats.todayCost.toFixed(4)} <span className="text-xs text-content-muted">/ ${aiStats.dailyBudget.toFixed(2)}</span>
                                    </div>
                                    <div className="mt-3">
                                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                                            <div 
                                                className="h-full rounded-full bg-gradient-to-r from-primary to-amber-500 transition-all duration-300"
                                                style={{ width: `${Math.min(100, (aiStats.todayCost / aiStats.dailyBudget) * 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-[9px] text-content-muted mt-1.5 block">Disjuntor financeiro global diário.</span>
                                    </div>
                                </div>

                                <div className="glow-card p-5 rounded-2xl border border-black/5 dark:border-white/5 bg-card flex flex-col justify-between min-h-[130px]">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-content-muted uppercase tracking-[0.16em]">Chamadas Realizadas</span>
                                            <BarChart3 size={14} className="text-primary" />
                                        </div>
                                        <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                                            {aiStats.todayCount} <span className="text-xs text-content-muted">solicitações</span>
                                        </div>
                                    </div>
                                    <span className="text-[9px] text-content-muted mt-3 block">Total de extrações IA executadas hoje (UTC).</span>
                                </div>

                                <div className="glow-card p-5 rounded-2xl border border-black/5 dark:border-white/5 bg-card flex flex-col justify-between min-h-[130px]">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-content-muted uppercase tracking-[0.16em]">Recusas / Erros</span>
                                            <XCircle size={14} className="text-rose-500" />
                                        </div>
                                        <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
                                            {aiStats.failedCount} <span className="text-xs text-content-muted">falhas hoje</span>
                                        </div>
                                    </div>
                                    <span className="text-[9px] text-content-muted mt-3 block">Processamentos falhos, rate limits ou abusos recusados.</span>
                                </div>

                                <div className="glow-card p-5 rounded-2xl border border-black/5 dark:border-white/5 bg-card flex flex-col justify-between min-h-[130px]">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-content-muted uppercase tracking-[0.16em]">Modelo Ativo Extrator</span>
                                            <Sparkles size={14} className="text-indigo-500 animate-pulse" />
                                        </div>
                                        <div className="text-base font-bold text-slate-900 dark:text-slate-100 break-all font-mono">
                                            gemini-2.5-flash
                                        </div>
                                    </div>
                                    <span className="text-[9px] text-content-muted mt-3 block">Configurado de forma segura em system_settings.</span>
                                </div>
                            </div>

                            <div className="glass-card rounded-2xl overflow-hidden border border-black/5 dark:border-white/5 mt-6">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Data/Hora</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estudante</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Operação</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Modelo</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Tokens (P/R)</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Custo Est.</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                            {aiLogs.map((log) => (
                                                <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                        {new Date(log.created_at).toLocaleString('pt-BR')}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-medium text-slate-900 dark:text-slate-100">{log.user_name}</span>
                                                            <span className="text-[10px] text-slate-400 font-normal">{log.user_email}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-mono">
                                                            {log.mode}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400 font-mono">
                                                        {log.model_name}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                                                        {log.prompt_tokens || 0} / {log.candidates_tokens || 0}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-900 dark:text-slate-200 tabular-nums">
                                                        ${Number(log.cost_estimate || 0).toFixed(6)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            log.status === 'success' 
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'
                                                        }`}>
                                                            {log.status === 'success' ? 'Sucesso' : 'Falha'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {aiLogs.length === 0 && !loadingAi && (
                                                <tr>
                                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                                                        Nenhuma chamada de IA registrada ainda.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
