import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
    Search, Filter, MessageSquare, ChevronDown, X, Eye, Clock,
    CheckCircle2, AlertTriangle, Wand2, PlusCircle, Loader2, RefreshCw,
    ArrowRight, Save, Inbox
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';

// ─── Tipos ──────────────────────────────────────────────────
type FeedbackStatus = 'nova' | 'planejada' | 'em_desenvolvimento' | 'concluida' | 'nao_planejada' | 'new' | 'triaged' | 'in_progress' | 'resolved' | 'wont_fix';
type FeedbackType = 'melhoria' | 'nova_funcionalidade' | 'problema' | 'improvement' | 'feature_request' | 'ux_issue';

interface FeedbackRecord {
    id: string;
    protocol_code: string;
    feedback_id: string;
    type: FeedbackType;
    title: string;
    description: string;
    status: FeedbackStatus;
    impact: string;
    actor_user_id: string;
    actor_email: string | null;
    route_path: string | null;
    feature_area: string | null;
    session_id: string | null;
    metadata: Record<string, unknown> | null;
    admin_notes: string | null;
    admin_reply: string | null;
    admin_reply_at: string | null;
    admin_reason: string | null;
    assigned_to: string | null;
    first_response_at: string | null;
    resolved_at: string | null;
    created_at: string;
    updated_at: string;
}

// ─── Config ─────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    nova: { label: 'Nova', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: <Clock size={12} /> },
    planejada: { label: 'Planejada', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: <Eye size={12} /> },
    em_desenvolvimento: { label: 'Em Desenvolvimento', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: <Loader2 size={12} /> },
    concluida: { label: 'Concluída', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', icon: <CheckCircle2 size={12} /> },
    nao_planejada: { label: 'Não Planejada', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800', icon: <X size={12} /> },
    // Legacy (mapeiam para os mesmos labels PT-BR oficiais)
    new: { label: 'Nova', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: <Clock size={12} /> },
    triaged: { label: 'Planejada', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: <Eye size={12} /> },
    in_progress: { label: 'Em Desenvolvimento', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: <Loader2 size={12} /> },
    resolved: { label: 'Concluída', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', icon: <CheckCircle2 size={12} /> },
    wont_fix: { label: 'Não Planejada', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800', icon: <X size={12} /> },
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
    melhoria: { label: 'Melhoria', icon: <Wand2 size={12} /> },
    nova_funcionalidade: { label: 'Nova Funcionalidade', icon: <PlusCircle size={12} /> },
    problema: { label: 'Problema', icon: <AlertTriangle size={12} /> },
    improvement: { label: 'Melhoria', icon: <Wand2 size={12} /> },
    feature_request: { label: 'Nova Funcionalidade', icon: <PlusCircle size={12} /> },
    ux_issue: { label: 'Problema', icon: <AlertTriangle size={12} /> },
};


const IMPACT_MAP: Record<string, string> = {
    low: 'Baixo',
    medium: 'Médio',
    high: 'Alto',
    critical: 'Crítico',
};

const PIPELINE_STATUSES: FeedbackStatus[] = ['nova', 'planejada', 'em_desenvolvimento', 'concluida', 'nao_planejada'];

// ─── Helpers ────────────────────────────────────────────────
function formatDate(d: string) {
    return format(new Date(d), "dd/MM/yy HH:mm", { locale: ptBR });
}

// ─── Componente Principal ───────────────────────────────────
const AdminFeedback: React.FC = () => {
    const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filtros
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('todas');
    const [typeFilter, setTypeFilter] = useState<string>('todos');

    // Dialog
    const [selectedFeedback, setSelectedFeedback] = useState<FeedbackRecord | null>(null);
    const [editStatus, setEditStatus] = useState<FeedbackStatus>('nova');
    const [editReply, setEditReply] = useState('');
    const [editReason, setEditReason] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [replyError, setReplyError] = useState('');

    // ── Fetch ─────────────────────────────────────────────────
    const fetchFeedbacks = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('user_feedback_events')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200);

            if (fetchError) throw fetchError;
            setFeedbacks((data ?? []) as unknown as FeedbackRecord[]);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao carregar feedbacks';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchFeedbacks(); }, [fetchFeedbacks]);

    // ── Filtrar ───────────────────────────────────────────────
    const filtered = useMemo(() => {
        return feedbacks.filter((fb) => {
            if (statusFilter !== 'todas' && fb.status !== statusFilter) return false;
            if (typeFilter !== 'todos' && fb.type !== typeFilter) return false;
            if (search.trim()) {
                const q = search.toLowerCase();
                const matchesProtocol = fb.protocol_code?.toLowerCase().includes(q);
                const matchesTitle = fb.title.toLowerCase().includes(q);
                const matchesEmail = fb.actor_email?.toLowerCase().includes(q);
                if (!matchesProtocol && !matchesTitle && !matchesEmail) return false;
            }
            return true;
        });
    }, [feedbacks, statusFilter, typeFilter, search]);

    // ── KPIs ──────────────────────────────────────────────────
    const kpis = useMemo(() => {
        const total = feedbacks.length;
        const novos = feedbacks.filter((f) => f.status === 'nova' || f.status === 'new').length;
        const emDev = feedbacks.filter((f) => f.status === 'em_desenvolvimento' || f.status === 'in_progress').length;
        const concluidos = feedbacks.filter((f) => f.status === 'concluida' || f.status === 'resolved').length;
        return { total, novos, emDev, concluidos };
    }, [feedbacks]);

    // ── Abrir detalhe ─────────────────────────────────────────
    const openDetail = (fb: FeedbackRecord) => {
        setSelectedFeedback(fb);
        setEditStatus(fb.status);
        setEditReply(fb.admin_reply || '');
        setEditReason(fb.admin_reason || '');
        setEditNotes(fb.admin_notes || '');
        setReplyError('');
    };

    // Resposta obrigatória quando status ≠ Nova
    const isReplyRequired = editStatus !== 'nova' && editStatus !== 'new';

    // ── Salvar alterações admin ───────────────────────────────
    const handleSave = async () => {
        if (!selectedFeedback) return;

        // Validar resposta obrigatória
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

            // Resposta ao aluno
            if (editReply.trim() && editReply.trim() !== (selectedFeedback.admin_reply || '')) {
                updates.admin_reply = editReply.trim();
                updates.admin_reply_at = now;
                if (!selectedFeedback.first_response_at) {
                    updates.first_response_at = now;
                }
            }

            // Razão para "não planejada"
            if (editStatus === 'nao_planejada' || editStatus === 'wont_fix') {
                updates.admin_reason = editReason.trim() || null;
            }

            // Timestamps de resolução
            if ((editStatus === 'concluida' || editStatus === 'resolved') && !selectedFeedback.resolved_at) {
                updates.resolved_at = now;
            }

            const { error: updateError } = await supabase
                .from('user_feedback_events')
                .update(updates as never)
                .eq('id', selectedFeedback.id);

            if (updateError) throw updateError;

            // Registrar auditoria
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('audit_logs').insert({
                    actor_user_id: user.id,
                    event_type: 'feedback_status_change',
                    event_category: 'admin_action',
                    description: `Status do feedback ${selectedFeedback.protocol_code} alterado de "${selectedFeedback.status}" para "${editStatus}"`,
                    metadata: {
                        feedback_id: selectedFeedback.id,
                        protocol_code: selectedFeedback.protocol_code,
                        old_status: selectedFeedback.status,
                        new_status: editStatus,
                        has_reply: !!editReply.trim(),
                    },
                } as never);
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

    // ── Render ────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* ── Header ───────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <MessageSquare size={22} className="text-blue-500" />
                        Feedbacks dos Alunos
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Gerencie e responda aos feedbacks recebidos.</p>
                </div>
                <button
                    onClick={fetchFeedbacks}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                    <RefreshCw size={14} />
                    Atualizar
                </button>
            </div>

            {/* ── KPIs ──────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total', value: kpis.total, color: 'text-slate-700 dark:text-slate-300', bg: 'bg-white dark:bg-slate-800' },
                    { label: 'Novos', value: kpis.novos, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    { label: 'Em Desenvolvimento', value: kpis.emDev, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'Concluídos', value: kpis.concluidos, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                ].map((kpi) => (
                    <div key={kpi.label} className={`${kpi.bg} rounded-xl p-4 border border-slate-200 dark:border-slate-700`}>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{kpi.label}</p>
                        <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* ── Filtros ───────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Busca */}
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por protocolo, título ou email..."
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>

                {/* Status */}
                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="appearance-none pl-3 pr-8 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="todas">Status: Todas</option>
                        {PIPELINE_STATUSES.map((s) => (
                            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {/* Tipo */}
                <div className="relative">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="appearance-none pl-3 pr-8 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="todos">Tipo: Todos</option>
                        <option value="melhoria">Melhoria</option>
                        <option value="nova_funcionalidade">Nova Funcionalidade</option>
                        <option value="problema">Problema</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* ── Tabela ────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400">
                        <Loader2 size={24} className="animate-spin mr-2" />
                        <span className="text-sm font-medium">Carregando feedbacks...</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <AlertTriangle size={24} className="mb-2 text-red-400" />
                        <p className="text-sm text-red-500 mb-2">{error}</p>
                        <button onClick={fetchFeedbacks} className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                            <RefreshCw size={14} /> Tentar novamente
                        </button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <Inbox size={28} className="mb-2 opacity-40" />
                        <p className="text-sm font-medium">Nenhum feedback encontrado</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr className="text-left">
                                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Protocolo</th>
                                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Criado</th>
                                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Tipo</th>
                                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Título</th>
                                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Ator</th>
                                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filtered.map((fb) => {
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
                                            <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate">
                                                {fb.actor_email || fb.actor_user_id.substring(0, 8)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => openDetail(fb)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                    title="Ver detalhes"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Contagem */}
                {!isLoading && !error && filtered.length > 0 && (
                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500">
                        {filtered.length} de {feedbacks.length} feedback{feedbacks.length !== 1 ? 's' : ''}
                    </div>
                )}
            </div>

            {/* ── Dialog Detalhe ───────────────────────────── */}
            <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    {selectedFeedback && (() => {
                        const statusCfg = STATUS_CONFIG[selectedFeedback.status] || STATUS_CONFIG.nova;
                        const typeCfg = TYPE_CONFIG[selectedFeedback.type] || TYPE_CONFIG.melhoria;
                        return (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-lg">
                                        <span className="font-mono text-blue-600 dark:text-blue-400">{selectedFeedback.protocol_code}</span>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusCfg.bg} ${statusCfg.color}`}>
                                            {statusCfg.icon}
                                            {statusCfg.label}
                                        </span>
                                    </DialogTitle>
                                </DialogHeader>

                                <div className="space-y-5 mt-2">
                                    {/* Info Principal */}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400 uppercase mb-0.5">Tipo</p>
                                            <p className="flex items-center gap-1 text-slate-700 dark:text-slate-300">{typeCfg.icon} {typeCfg.label}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400 uppercase mb-0.5">Criado em</p>
                                            <p className="text-slate-700 dark:text-slate-300">{formatDate(selectedFeedback.created_at)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400 uppercase mb-0.5">Ator</p>
                                            <p className="text-slate-700 dark:text-slate-300">{selectedFeedback.actor_email || selectedFeedback.actor_user_id}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400 uppercase mb-0.5">Impacto</p>
                                            <p className="text-slate-700 dark:text-slate-300">{IMPACT_MAP[selectedFeedback.impact] || selectedFeedback.impact}</p>
                                        </div>
                                    </div>

                                    {/* Título + Descrição */}
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Título</p>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedFeedback.title}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Descrição</p>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedFeedback.description}</p>
                                    </div>

                                    {/* Metadados Técnicos */}
                                    {(selectedFeedback.route_path || selectedFeedback.feature_area || selectedFeedback.session_id) && (
                                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 space-y-1.5">
                                            <p className="text-xs font-semibold text-slate-400 uppercase">Contexto Técnico</p>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                {selectedFeedback.route_path && (
                                                    <div>
                                                        <span className="text-slate-400">Rota:</span>{' '}
                                                        <span className="font-mono text-slate-600 dark:text-slate-400">{selectedFeedback.route_path}</span>
                                                    </div>
                                                )}
                                                {selectedFeedback.feature_area && (
                                                    <div>
                                                        <span className="text-slate-400">Área:</span>{' '}
                                                        <span className="font-mono text-slate-600 dark:text-slate-400">{selectedFeedback.feature_area}</span>
                                                    </div>
                                                )}
                                                {selectedFeedback.session_id && (
                                                    <div>
                                                        <span className="text-slate-400">Sessão:</span>{' '}
                                                        <span className="font-mono text-slate-600 dark:text-slate-400">{selectedFeedback.session_id}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Separador ──────────────────────────── */}
                                    <hr className="border-slate-200 dark:border-slate-700" />

                                    {/* ── Ações do Admin ─────────────────────── */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Ações do Admin</h3>

                                        {/* Pipeline de Status */}
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 uppercase block mb-2">Alterar Status</label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {PIPELINE_STATUSES.map((s) => {
                                                    const cfg = STATUS_CONFIG[s];
                                                    const isActive = editStatus === s;
                                                    return (
                                                        <button
                                                            key={s}
                                                            onClick={() => setEditStatus(s)}
                                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${isActive
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
                                            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">
                                                Resposta ao Aluno
                                                {isReplyRequired && <span className="text-red-500 ml-0.5">*</span>}
                                                <span className="text-slate-400 font-normal ml-1">(visível na Central do Aluno)</span>
                                            </label>
                                            <textarea
                                                value={editReply}
                                                onChange={(e) => { setEditReply(e.target.value); if (replyError) setReplyError(''); }}
                                                placeholder="Escreva uma resposta para o aluno..."
                                                rows={3}
                                                className={`w-full text-sm bg-white dark:bg-slate-900 border rounded-lg p-3 outline-none focus:ring-2 resize-none ${replyError
                                                        ? 'border-red-400 focus:ring-red-400/30'
                                                        : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                                                    }`}
                                                maxLength={1000}
                                            />
                                            {replyError && (
                                                <p className="text-xs text-red-500 mt-1">{replyError}</p>
                                            )}
                                        </div>

                                        {/* Motivo (Não Planejada) */}
                                        {(editStatus === 'nao_planejada' || editStatus === 'wont_fix') && (
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">
                                                    Motivo
                                                    <span className="text-slate-400 font-normal ml-1">(visível ao aluno)</span>
                                                </label>
                                                <textarea
                                                    value={editReason}
                                                    onChange={(e) => setEditReason(e.target.value)}
                                                    placeholder="Explique brevemente o motivo..."
                                                    rows={2}
                                                    className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                    maxLength={500}
                                                />
                                            </div>
                                        )}

                                        {/* Notas Internas */}
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">
                                                Notas Internas
                                                <span className="text-slate-400 font-normal ml-1">(não visível ao aluno)</span>
                                            </label>
                                            <textarea
                                                value={editNotes}
                                                onChange={(e) => setEditNotes(e.target.value)}
                                                placeholder="Notas internas para a equipe..."
                                                rows={2}
                                                className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                maxLength={1000}
                                            />
                                        </div>
                                    </div>

                                    {/* ── Footer ─────────────────────────────── */}
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            onClick={() => setSelectedFeedback(null)}
                                            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className="px-4 py-2 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                        >
                                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminFeedback;
