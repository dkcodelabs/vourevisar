import React, { useState } from 'react';
import {
    Search, Filter, MessageSquare, ChevronDown, RefreshCw, X, Clock, Loader2,
    CheckCircle2, AlertTriangle, Eye, Wand2,
    ArrowRight, Save, Inbox, BarChart3
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

import { isValidTransition, getFeedbackStatusLabel, type FeedbackStatus, calculateSLADueDates, checkSLABreach } from '@/services/feedbackService';
import { deleteAdminFeedback, updateAdminFeedback } from '@/services/adminFeedbackService';
import { parseISO } from 'date-fns';
import { SLAAnalyticsDashboard } from '@/components/admin/sla/SLAAnalyticsDashboard';
import { Trash2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
    DEFAULT_TEMPLATE_BY_STATUS,
    IMPACT_MAP,
    PIPELINE_STATUSES,
    RESPONSE_TEMPLATES,
    STATUS_CONFIG,
    TYPE_CONFIG,
    formatDate,
    getSLAStatusBadge,
    type FeedbackRecord,
} from '@/components/admin/adminFeedbackConfig';
import { useAdminFeedbackData } from '@/hooks/useAdminFeedbackData';

const AdminFeedback: React.FC = () => {
    // URL Sync (Simulado via window.history por enquanto se não tiver router hook fácil, mas usaremos state local por simplicidade na v1.1 Sprint 1)
    // Filtros
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('todas');
    const [typeFilter, setTypeFilter] = useState<string>('todos');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Dialog
    const [selectedFeedback, setSelectedFeedback] = useState<FeedbackRecord | null>(null);
    const [editStatus, setEditStatus] = useState<FeedbackStatus>('nova');
    const [editReply, setEditReply] = useState('');
    const [dirtyReply, setDirtyReply] = useState(false); // [ADM-02] Novo estado para controle de edição manual
    const [editReason, setEditReason] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [replyError, setReplyError] = useState('');
    const [showAnalytics, setShowAnalytics] = useState(false);

    // Dialog Deleção
    const [feedbackToDelete, setFeedbackToDelete] = useState<FeedbackRecord | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { error, feedbacks, fetchFeedbacks, isLoading, kpis } = useAdminFeedbackData({
        endDate, search, startDate, statusFilter, typeFilter,
    });

    const clearFilters = () => {
        setSearch('');
        setStatusFilter('todas');
        setTypeFilter('todos');
        setStartDate('');
        setEndDate('');
    };


    // ── Abrir detalhe ─────────────────────────────────────────
    const openDetail = (fb: FeedbackRecord) => {
        setSelectedFeedback(fb);
        setEditStatus(fb.status);
        setEditReply(fb.admin_reply || '');
        setDirtyReply(false); // [ADM-02] Reset dirty state
        setEditReason(fb.admin_reason || '');
        setEditNotes(fb.admin_notes || '');
        setReplyError('');
    };

    const isReplyRequired = editStatus !== 'nova';

    // [ADM-02] Handler para mudança de status com lógica de template
    const handleStatusChange = (newStatus: FeedbackStatus) => {
        const currentTemplate = DEFAULT_TEMPLATE_BY_STATUS[newStatus];

        // Se NÃO editou manualmente, troca o template automaticamente
        if (!dirtyReply) {
            setEditReply(currentTemplate || '');
        }

        // Se JÁ editou (dirtyReply=true), mantém o texto atual mas permite user trocar depois
        setEditStatus(newStatus);
    };

    // [ADM-02] Handler aplicar template manual
    const handleTemplateSelect = (text: string) => {
        setEditReply(text);
        setDirtyReply(false); // Reset dirty flag pois é um template oficial
    };

    // [ADM-02] Aplicar template sugerido (para caso de dirty)
    const applySuggestedTemplate = () => {
        const suggestion = DEFAULT_TEMPLATE_BY_STATUS[editStatus];
        if (suggestion) {
            setEditReply(suggestion);
            setDirtyReply(false);
        }
    };

    const handleSave = async () => {
        if (!selectedFeedback) return;
        if (isReplyRequired && !editReply.trim()) {
            setReplyError('Resposta ao aluno é obrigatória ao alterar o status.');
            return;
        }
        setReplyError('');
        setIsSaving(true);
        try {
            const now = new Date().toISOString();
            const updates: Record<string, unknown> = {
                status: editStatus,
                admin_notes: editNotes.trim() || null,
                updated_at: now,
            };

            if (editReply.trim() && editReply.trim() !== (selectedFeedback.admin_reply || '')) {
                updates.admin_reply = editReply.trim();
                updates.admin_reply_at = now;
                if (!selectedFeedback.first_response_at) {
                    updates.first_response_at = now;
                    // Check breach on first response
                    if (selectedFeedback.sla_first_response_due_at) {
                        updates.sla_breached_first_response = checkSLABreach(selectedFeedback.sla_first_response_due_at, now);
                    }
                }
            }

            if (editStatus === 'nao_planejada') {
                updates.admin_reason = editReason.trim() || null;
            }

            if (editStatus === 'concluida' && !selectedFeedback.resolved_at) {
                updates.resolved_at = now;
                // Check breach on resolution
                if (selectedFeedback.sla_resolution_due_at) {
                    updates.sla_breached_resolution = checkSLABreach(selectedFeedback.sla_resolution_due_at, now);
                }
            }

            await updateAdminFeedback(selectedFeedback.id, updates, {
                description: `Status do feedback ${selectedFeedback.protocol_code} alterado de "${selectedFeedback.status}" para "${editStatus}"`,
                feedback_id: selectedFeedback.id,
                protocol_code: selectedFeedback.protocol_code,
                old_status: selectedFeedback.status,
                new_status: editStatus,
                has_reply: !!editReply.trim(),
            });

            // Observability: Analytics (Client-side)
            const analytics = (window as Window & { analytics?: { sendEvent: (event: string, payload: Record<string, unknown>) => void } }).analytics;
            if (analytics) {
                analytics.sendEvent('admin_feedback_updated', {
                    feedback_id: selectedFeedback.id,
                    old_status: selectedFeedback.status,
                    new_status: editStatus,
                    has_reply: !!editReply.trim(),
                });
            }

            toast.success('Feedback atualizado com sucesso');
            setSelectedFeedback(null);
            fetchFeedbacks();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao salvar';
            toastGate.notifyError(msg, 'admin-feedback-save');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!feedbackToDelete) return;
        setIsDeleting(true);
        try {
            await deleteAdminFeedback(feedbackToDelete.id, {
                description: `Feedback ${feedbackToDelete.protocol_code} excluído`,
                feedback_id: feedbackToDelete.id,
                protocol_code: feedbackToDelete.protocol_code,
                title: feedbackToDelete.title,
            });

            toast.success('Feedback excluído com sucesso');
            setFeedbackToDelete(null);
            if (selectedFeedback?.id === feedbackToDelete.id) {
                setSelectedFeedback(null);
            }
            fetchFeedbacks();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao excluir feedback';
            toastGate.notifyError(msg, 'admin-feedback-delete');
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return <LoadingSpinner size="large" showText fullPage />;
    }

    return (
        <>
            <div className="space-y-5">
                {/* ── Top Actions ────────────────────────── */}
                <div className="flex justify-end gap-2 mb-1">
                    <button
                        onClick={fetchFeedbacks}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-700 dark:text-slate-300"
                    >
                        <RefreshCw size={14} />
                        <span className="hidden sm:inline">Atualizar</span>
                    </button>
                    <button
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${showAnalytics
                            ? 'bg-red-50 text-red-600 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/30'
                            : 'bg-blue-500 text-white border border-blue-600 hover:bg-blue-600 shadow-blue-500/20'}`}
                    >
                        {showAnalytics ? <X size={14} /> : <BarChart3 size={14} />}
                        <span className="hidden sm:inline">{showAnalytics ? 'Ocultar Analytics' : 'Analytics de SLA'}</span>
                    </button>
                </div>

                {/* ── Dashboard Analytics (Condicional) ──────────── */}
                {showAnalytics && <SLAAnalyticsDashboard />}

                {/* ── Filtros e Ações ───────────────────────── */}
                <div className="glass-card p-3.5 sm:p-4 rounded-2xl flex flex-col lg:flex-row gap-3 lg:items-center">
                    {/* Linha 1: Busca */}
                    <div className="relative min-w-[180px] lg:max-w-[16rem] xl:max-w-sm flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar protocolo..."
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                    {/* Linha 2/resto: Filtros Dropdown, Data e Botoes */}
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-1">
                        <div className="relative flex-1 sm:flex-none sm:min-w-[130px]">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full appearance-none pl-4 pr-9 py-2.5 text-sm bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-foreground"
                            >
                                <option value="todas">Status</option>
                                {PIPELINE_STATUSES.map((s) => (
                                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="relative flex-1 sm:flex-none sm:min-w-[130px]">
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="w-full appearance-none pl-4 pr-9 py-2.5 text-sm bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-foreground"
                            >
                                <option value="todos">Tipo</option>
                                <option value="melhoria">Melhoria</option>
                                <option value="nova_funcionalidade">Nova Func.</option>
                                <option value="problema">Problema</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

                        <div className="flex flex-1 sm:flex-none lg:flex-1 xl:flex-none items-center gap-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border-transparent rounded-xl px-3 py-2 transition-all">
                            <Clock size={14} className="text-slate-400 shrink-0" />
                            <input
                                type="date"
                                className="bg-transparent text-sm text-slate-700 dark:text-slate-300 outline-none w-full sm:w-[110px]"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                            <span className="text-slate-400 text-xs shrink-0">até</span>
                            <input
                                type="date"
                                className="bg-transparent text-sm text-slate-700 dark:text-slate-300 outline-none w-full sm:w-[110px]"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>

                        {(statusFilter !== 'todas' || typeFilter !== 'todos' || search || startDate || endDate) && (
                            <button
                                onClick={clearFilters}
                                className="w-[38px] h-[38px] flex shrink-0 items-center justify-center bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl transition-colors"
                                title="Limpar Filtros"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── KPIs (Resultados da Busca) ────────────────── */}
                {/* ── KPIs (Resultados da Busca) ────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
                    {[
                        { label: 'Total Encontrado', value: kpis.total, color: 'text-blue-600 dark:text-blue-400', icon: <Inbox size={16} /> },
                        { label: 'Novos', value: kpis.novos, color: 'text-amber-600 dark:text-amber-400', icon: <Clock size={16} /> },
                        { label: 'Em Desenvolvimento', value: kpis.emDev, color: 'text-purple-600 dark:text-purple-400', icon: <Loader2 size={16} /> },
                        { label: 'Não Planejada', value: kpis.naoPlanejadas, color: 'text-rose-600 dark:text-rose-400', icon: <X size={16} /> },
                        { label: 'Concluídos', value: kpis.concluidos, color: 'text-green-600 dark:text-green-400', icon: <CheckCircle2 size={16} /> },
                    ].map((kpi) => (
                        <div key={kpi.label} className="glow-card p-3 sm:p-4 rounded-2xl flex items-center justify-between group">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400">{kpi.label}</span>
                                <div className="flex items-baseline gap-2">
                                    <p className={`text-xl sm:text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
                                </div>
                            </div>
                            <div className="w-8 h-8 bg-black/5 dark:bg-white/5 rounded-lg flex items-center justify-center shrink-0">
                                <span className="opacity-80">{kpi.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Tabela ────────────────────────────────────── */}
                <div className="glass-card rounded-2xl overflow-hidden border border-black/5 dark:border-white/5">
                    {error ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <AlertTriangle size={24} className="mb-2 text-red-400" />
                            <p className="text-sm text-red-500 mb-2">{error}</p>
                            <button onClick={fetchFeedbacks} className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                                <RefreshCw size={14} /> Tentar novamente
                            </button>
                        </div>
                    ) : feedbacks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <Inbox size={28} className="mb-2 opacity-40" />
                            <p className="text-sm font-medium">Nenhum feedback encontrado</p>
                            <p className="text-xs mt-1">Tente ajustar os filtros</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-white/5">
                                    <tr className="text-left">
                                        <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Protocolo</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Criado</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Tipo</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Título</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">SLA Resp.</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">SLA Resol.</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Ator</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {feedbacks.map((fb) => {
                                        const statusCfg = STATUS_CONFIG[fb.status] || STATUS_CONFIG.nova;
                                        const typeCfg = TYPE_CONFIG[fb.type] || TYPE_CONFIG.melhoria;
                                        return (
                                            <tr key={fb.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                                        {fb.protocol_code}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                                                    {formatDate(fb.created_at)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                                                        {typeCfg.icon}
                                                        {typeCfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 max-w-[240px]">
                                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate block">
                                                        {fb.title}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusCfg.bg} ${statusCfg.color}`}>
                                                        {statusCfg.icon}
                                                        {statusCfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {(() => {
                                                        const badge = getSLAStatusBadge(fb.sla_first_response_due_at, fb.first_response_at, fb.sla_breached_first_response, 'response');
                                                        return (
                                                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold whitespace-nowrap ${badge.bg} ${badge.color}`}>
                                                                {badge.label}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {(() => {
                                                        const badge = getSLAStatusBadge(fb.sla_resolution_due_at, fb.resolved_at, fb.sla_breached_resolution, 'resolution');
                                                        return (
                                                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold whitespace-nowrap ${badge.bg} ${badge.color}`}>
                                                                {badge.label}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate">
                                                    {fb.actor_email || fb.actor_user_id.substring(0, 8)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            onClick={() => openDetail(fb)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                            title="Ver detalhes"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setFeedbackToDelete(fb)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                            title="Excluir feedback"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ── Dialog Detalhe ───────────────────────────── */}
                <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
                    <DialogContent className="max-w-xl max-h-[90vh] z-[200] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-[#1A1A1A] border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl">
                        {selectedFeedback && (() => {
                            const statusCfg = STATUS_CONFIG[selectedFeedback.status] || STATUS_CONFIG.nova;
                            const typeCfg = TYPE_CONFIG[selectedFeedback.type] || TYPE_CONFIG.melhoria;
                            return (
                                <>
                                    <DialogHeader className="px-6 py-5 bg-slate-50 dark:bg-black/20 border-b border-slate-200 dark:border-white/5 shrink-0">
                                        <div className="flex items-center justify-between">
                                            <DialogTitle className="flex items-center gap-2 text-base">
                                                <span className="font-mono text-blue-600 dark:text-blue-400">{selectedFeedback.protocol_code}</span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusCfg.bg} ${statusCfg.color}`}>
                                                    {statusCfg.icon}
                                                    {statusCfg.label}
                                                </span>
                                            </DialogTitle>
                                            <button
                                                onClick={() => setFeedbackToDelete(selectedFeedback)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                title="Excluir feedback"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </DialogHeader>

                                    {/* Área de Scroll */}
                                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                                        {/* Info Principal */}
                                        <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1 opacity-70">Tipo</p>
                                                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                                                    {typeCfg.icon}
                                                    {typeCfg.label}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1 opacity-70">Criado em</p>
                                                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{formatDate(selectedFeedback.created_at)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1 opacity-70">Ator</p>
                                                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 break-all">{selectedFeedback.actor_email || selectedFeedback.actor_user_id}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1 opacity-70">Impacto</p>
                                                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{IMPACT_MAP[selectedFeedback.impact] || selectedFeedback.impact}</p>
                                            </div>
                                        </div>

                                        {/* Título + Descrição ──────────────────────── */}
                                        <div className="space-y-3 bg-slate-50 dark:bg-black/20 p-5 rounded-2xl border border-slate-200 dark:border-white/5">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1 opacity-70">Título do Feedback</p>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{selectedFeedback.title}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1 opacity-70">Descrição Detalhada</p>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{selectedFeedback.description}</p>
                                            </div>
                                        </div>

                                        <hr className="border-slate-200 dark:border-slate-700" />

                                        {/* ── Ações do Admin ─────────────────────── */}
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Ações do Admin</h3>

                                            {/* Pipeline de Status */}
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase block mb-2 opacity-70">Alterar Status</label>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {PIPELINE_STATUSES.map((s) => {
                                                        const cfg = STATUS_CONFIG[s];
                                                        const isActive = editStatus === s;
                                                        const isDisabled = !isValidTransition(selectedFeedback.status as FeedbackStatus, s);
                                                        if (isDisabled && !isActive) return null;

                                                        return (
                                                            <button
                                                                key={s}
                                                                onClick={() => handleStatusChange(s)}
                                                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all border ${isActive
                                                                    ? `${cfg.bg} ${cfg.color} border-current ring-1 ring-current/20`
                                                                    : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                                                    }`}
                                                            >
                                                                {cfg.icon}
                                                                {cfg.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Resposta ao Aluno */}
                                            <div>
                                                <div className="flex justify-between items-end mb-1.5">
                                                    <label className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider opacity-70">
                                                        Resposta ao Aluno
                                                        {isReplyRequired && <span className="text-red-500 ml-0.5">*</span>}
                                                    </label>

                                                    <div className="flex items-center gap-2">
                                                        {dirtyReply && editReply !== DEFAULT_TEMPLATE_BY_STATUS[editStatus] && DEFAULT_TEMPLATE_BY_STATUS[editStatus] && (
                                                            <button
                                                                onClick={applySuggestedTemplate}
                                                                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1"
                                                                title="Substituir pelo texto padrão deste status"
                                                            >
                                                                <Wand2 size={10} />
                                                                Aplicar padrão
                                                            </button>
                                                        )}

                                                        <select
                                                            className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border-none rounded px-2 py-1 text-slate-600 focus:ring-1 cursor-pointer max-w-[180px]"
                                                            value={(RESPONSE_TEMPLATES[editStatus] || []).find(t => t.text === editReply)?.text || ""}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val) handleTemplateSelect(val);
                                                            }}
                                                        >
                                                            <option value="">✨ Modelos ({STATUS_CONFIG[editStatus]?.label})</option>
                                                            {(RESPONSE_TEMPLATES[editStatus] || []).map((cr, idx) => (
                                                                <option key={idx} value={cr.text}>{cr.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <textarea
                                                    value={editReply}
                                                    onChange={(e) => {
                                                        setEditReply(e.target.value);
                                                        setDirtyReply(true);
                                                        if (replyError) setReplyError('');
                                                    }}
                                                    placeholder="Escreva uma resposta para o aluno..."
                                                    rows={4}
                                                    className={`w-full text-xs bg-slate-50 dark:bg-black/20 dark:border-white/5 border rounded-xl p-4 outline-none transition-all resize-none shadow-inner ${replyError
                                                        ? 'border-red-300 dark:border-red-500/50 focus:border-red-500 dark:focus:border-red-400 focus:ring-1 focus:ring-red-500/50'
                                                        : 'border-slate-300 dark:border-white/5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50'
                                                        }`}
                                                    maxLength={1000}
                                                />
                                                {replyError && (
                                                    <p className="text-[10px] text-red-500 mt-1">{replyError}</p>
                                                )}
                                            </div>

                                            {/* Motivo (Não Planejada) */}
                                            {editStatus === 'nao_planejada' && (
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase block mb-1.5 opacity-70">
                                                        Motivo
                                                        <span className="text-slate-400 font-normal ml-1">(visível ao aluno)</span>
                                                    </label>
                                                    <textarea
                                                        value={editReason}
                                                        onChange={(e) => setEditReason(e.target.value)}
                                                        placeholder="Explique brevemente o motivo..."
                                                        rows={2}
                                                        className="w-full text-xs bg-white dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                        maxLength={500}
                                                    />
                                                </div>
                                            )}

                                            {/* Notas Internas */}
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase block mb-1.5 opacity-70">
                                                    Notas Internas
                                                    <span className="text-slate-400 font-normal ml-1">(não visível ao aluno)</span>
                                                </label>
                                                <textarea
                                                    value={editNotes}
                                                    onChange={(e) => setEditNotes(e.target.value)}
                                                    placeholder="Notas internas para a equipe..."
                                                    rows={2}
                                                    className="w-full text-xs bg-slate-50 dark:bg-black/20 border border-slate-300 dark:border-white/5 rounded-xl p-4 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none shadow-inner"
                                                    maxLength={1000}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Footer Fixo ─────────────────────────────── */}
                                    <div className="flex justify-end gap-3 px-6 py-5 bg-slate-50 dark:bg-[#1A1A1A] border-t border-slate-200 dark:border-white/5 shrink-0 mt-auto">
                                        <button
                                            onClick={() => setSelectedFeedback(null)}
                                            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors uppercase tracking-wide"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className="px-4 py-2 text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 uppercase tracking-wide"
                                        >
                                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                                        </button>
                                    </div>
                                </>
                            );
                        })()}
                    </DialogContent>
                </Dialog>
            </div>
            {/* ── Dialog Confirmação de Deleção ───────────────────────────── */}
            <AlertDialog open={!!feedbackToDelete} onOpenChange={(open) => !open && !isDeleting && setFeedbackToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Feedback</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir o feedback <strong>{feedbackToDelete?.protocol_code}</strong>? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDelete();
                            }}
                            disabled={isDeleting}
                            className="bg-red-500 hover:bg-red-600 text-white"
                        >
                            {isDeleting ? <Loader2 size={14} className="animate-spin mr-2" /> : <Trash2 size={14} className="mr-2" />}
                            {isDeleting ? 'Excluindo...' : 'Excluir'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default AdminFeedback;
