import React from 'react';
import { motion } from 'framer-motion';
import {
    Trash2, Play, Eye, CalendarDays, Clock,
    BookOpen, AlertTriangle, CheckCircle2, Timer, GraduationCap, X, Loader2, RefreshCw
} from 'lucide-react';
import type { UserEdital } from '@/pages/Editais';

interface EditalCardProps {
    edital: UserEdital;
    metrics: {
        totalTopics: number;
        completedTopics: number;
        totalStudyMinutes: number;
        subjectsCount: number;
    };
    daysLeft: number | null;
    isSelected: boolean;
    onToggleSelect: () => void;
    onViewSubjects: () => void;
    onLoadCycle: () => void;
    onUnloadCycle: () => void;
    onDelete: () => void;
    isProcessing?: boolean;
    hasUpdate?: boolean;
    onSync?: () => void;
    isHighlighted?: boolean;
}

export const EditalCard = ({
    edital, metrics, daysLeft, isSelected,
    onToggleSelect, onViewSubjects, onLoadCycle, onUnloadCycle, onDelete,
    isProcessing = false, hasUpdate = false, onSync, isHighlighted = false
}: EditalCardProps) => {
    const progress = metrics.totalTopics > 0
        ? Math.round((metrics.completedTopics / metrics.totalTopics) * 100)
        : 0;

    const hours = Math.floor(metrics.totalStudyMinutes / 60);
    const mins = metrics.totalStudyMinutes % 60;
    const studyTimeLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    const getUrgencyColor = () => {
        if (daysLeft === null) return null;
        if (daysLeft <= 0) return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', label: 'Prova vencida' };
        if (daysLeft <= 7) return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', label: `${daysLeft}d` };
        if (daysLeft <= 30) return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', label: `${daysLeft}d` };
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: `${daysLeft}d` };
    };

    const urgency = getUrgencyColor();
    const createdDate = new Date(edital.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

    // Tenta separar Órgão e Cargo se houver " - "
    const nameParts = edital.name.split(' - ');
    const organ = nameParts[0];
    const position = nameParts.length > 1 ? nameParts.slice(1).join(' - ') : null;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="glow-card group relative overflow-hidden bg-zinc-900/40 border border-white/5 hover:border-white/10 transition-all duration-300 rounded-3xl w-full max-w-[420px] mx-auto xl:mx-0"
        >
            {/* Destaque (Highlight) via Div Absoluta para evitar recortes */}
            {isHighlighted && (
                <div className="absolute inset-0 rounded-[inherit] ring-[3px] ring-primary shadow-[0_0_20px_rgba(14,165,233,0.3)] animate-pulse-subtle pointer-events-none z-50" />
            )}

            {/* Excluir - Topo Direito */}
            <button
                onClick={onDelete}
                disabled={isProcessing}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-zinc-800/50 border border-white/5 hover:bg-red-500/10 text-content-muted hover:text-red-400 rounded-lg transition-all z-10 disabled:opacity-50"
                title="Excluir edital"
            >
                {isProcessing && !edital.mergedIntoCycle ? (
                    <Loader2 size={16} className="animate-spin text-red-500" />
                ) : (
                    <Trash2 size={16} />
                )}
            </button>

            {/* Sincronizar - Topo Direito (lado da lixeira) */}
            {edital.sourceId && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onSync?.();
                    }}
                    disabled={isProcessing}
                    className={`absolute top-4 right-14 w-8 h-8 flex items-center justify-center rounded-lg transition-all z-10 disabled:opacity-50 ${
                        hasUpdate 
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 animate-pulse border border-emerald-400' 
                            : 'bg-zinc-800/50 border border-white/5 text-content-muted hover:text-emerald-400'
                    }`}
                    title={hasUpdate ? "Atualização disponível!" : "Sincronizar com edital base"}
                >
                    {isProcessing && edital.sourceId ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <RefreshCw size={16} className={hasUpdate ? "animate-spin-slow" : ""} />
                    )}
                </button>
            )}

            <div className="p-4 md:p-5">
                <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                        <GraduationCap className="text-primary" size={20} />
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                        <h3 className="text-[15px] font-black text-foreground tracking-tight truncate uppercase">
                            {edital.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-md border ${
                                edital.isImported ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            }`}>
                                {edital.isImported ? 'IMPORTADO' : 'MANUAL'}
                            </span>
                            <span className="text-[10px] text-content-muted">•</span>
                            <span className="text-[10px] text-content-muted font-medium">{createdDate}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-black/20 dark:bg-white/5 rounded-2xl p-3 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpen size={12} className="text-content-muted" />
                            <span className="text-[9px] font-bold text-content-muted uppercase tracking-widest">Progresso</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <div className="text-base font-bold text-foreground leading-none">
                                {metrics.completedTopics}<span className="text-xs text-content-muted font-medium ml-1">/{metrics.totalTopics} tópicos</span>
                            </div>
                            <div className="text-[11px] text-content-muted font-bold tracking-tight">
                                {metrics.subjectsCount} matéria{metrics.subjectsCount !== 1 ? 's' : ''}
                            </div>
                        </div>
                        <div className="w-full h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden border border-white/5">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    <div className="bg-black/20 dark:bg-white/5 rounded-2xl p-3 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <Timer size={12} className="text-content-muted" />
                            <span className="text-[9px] font-bold text-content-muted uppercase tracking-widest">Tempo</span>
                        </div>
                        <div className="text-base font-bold text-foreground leading-none">
                            {studyTimeLabel}
                        </div>
                        <p className="text-[10px] text-content-muted mt-1 font-bold lowercase tracking-tight">
                            tempo de estudo
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-4 min-h-[52px] justify-center">
                    {metrics.subjectsCount > 0 ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onViewSubjects}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-800/80 border border-white/5 hover:bg-zinc-700 text-content-muted hover:text-content-main rounded-xl transition-all text-xs font-bold"
                            >
                                <Eye size={14} />
                                Ver Matérias
                            </button>
                            <button
                                onClick={edital.mergedIntoCycle ? onUnloadCycle : onLoadCycle}
                                disabled={isProcessing}
                                className={`flex-[1.8] flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all text-xs font-bold shadow-lg disabled:opacity-60 disabled:cursor-not-allowed ${
                                    edital.mergedIntoCycle
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 shadow-none'
                                        : 'bg-primary hover:bg-primary/90 text-white shadow-primary/20'
                                }`}
                            >
                                {isProcessing ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : edital.mergedIntoCycle ? (
                                    <>
                                        <X size={14} />
                                        Remover
                                    </>
                                ) : (
                                    <>
                                        <Play size={14} />
                                        Carregar Ciclo
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onViewSubjects}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-800/80 border border-white/5 hover:bg-zinc-700 text-content-muted hover:text-content-main rounded-xl transition-all text-xs font-bold"
                            >
                                <Eye size={14} />
                                Ver Matérias
                            </button>

                            <div className="flex-[1.8] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                                <span className="text-[11px] font-bold text-amber-400 leading-tight">Edital sem matérias, aguarde.</span>
                            </div>
                        </div>
                    )}
                </div>

                {urgency && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mt-4 border ${urgency.bg} ${urgency.border}`}>
                        <AlertTriangle size={14} className={urgency.text} />
                        <span className={`text-xs font-semibold ${urgency.text}`}>
                            {daysLeft !== null && daysLeft > 0 ? `${daysLeft} dias para a prova` : urgency.label}
                        </span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
