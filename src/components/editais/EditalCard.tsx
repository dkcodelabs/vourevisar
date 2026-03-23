import React from 'react';
import { motion } from 'framer-motion';
import {
    Trash2, Play, Eye, CalendarDays, Clock,
    BookOpen, AlertTriangle, CheckCircle2, Timer, GraduationCap, X, Loader2, RefreshCw,
    Edit2, Plus
} from 'lucide-react';
import type { UserEdital } from '@/pages/Editais';

interface EditalCardProps {
    edital: UserEdital;
    metrics: {
        totalTopics: number;
        completedTopics: number;
        totalStudyMinutes: number;
        subjectsCount: number;
        completedSubjectsCount?: number;
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
    onEdit?: () => void;
    onComplement?: () => void;
    isHighlighted?: boolean;
}

export const EditalCard = ({
    edital, metrics, daysLeft, isSelected,
    onToggleSelect, onViewSubjects, onLoadCycle, onUnloadCycle, onDelete,
    isProcessing = false, hasUpdate = false, onSync, onEdit, onComplement, isHighlighted = false
}: EditalCardProps) => {
    const progress = metrics.totalTopics > 0
        ? Math.round((metrics.completedTopics / metrics.totalTopics) * 100)
        : 0;

    const hours = Math.floor(metrics.totalStudyMinutes / 60);
    const mins = metrics.totalStudyMinutes % 60;
    const studyTimeLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    const getUrgencyColor = () => {
        if (daysLeft === null) return null;
        if (daysLeft <= 0) return { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20', label: 'Prova vencida' };
        if (daysLeft <= 7) return { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20', label: `${daysLeft}d` };
        if (daysLeft <= 30) return { bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-500/20', label: `${daysLeft}d` };
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/20', label: `${daysLeft}d` };
    };

    const urgency = getUrgencyColor();
    const createdDate = new Date(edital.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

    // Procura por Órgão e Cargo estruturados ou faz o split do name como fallback
    const displayOrgan = edital.organ || edital.name.split(' - ')[0];
    const displayPosition = edital.position || (edital.name.split(' - ').length > 1 ? edital.name.split(' - ').slice(1).join(' - ') : null);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="glow-card group relative overflow-hidden bg-card dark:bg-zinc-900/40 border border-border dark:border-white/5 hover:border-border-strong dark:hover:border-white/10 transition-all duration-300 rounded-3xl w-full max-w-[420px] mx-auto xl:mx-0"
        >
            {/* Destaque (Highlight) via Div Absoluta para evitar recortes */}
            {isHighlighted && (
                <div className="absolute inset-0 rounded-[inherit] ring-[3px] ring-primary shadow-[0_0_20px_rgba(14,165,233,0.3)] animate-pulse-subtle pointer-events-none z-50" />
            )}

            {/* Excluir - Topo Direito */}
            <button
                onClick={onDelete}
                disabled={isProcessing}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-secondary/50 dark:bg-zinc-800/50 border border-border dark:border-white/5 hover:bg-red-500/10 text-content-muted hover:text-red-400 rounded-lg transition-all z-10 disabled:opacity-50"
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
                            : 'bg-secondary/50 dark:bg-zinc-800/50 border border-border dark:border-white/5 text-content-muted hover:text-emerald-400'
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
                        <h3 className="text-[15px] font-black text-foreground tracking-tight truncate uppercase flex items-center gap-2">
                            {displayOrgan}
                            {edital.year && (
                                <span className="text-[11px] text-primary font-bold bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10 tracking-normal">
                                    {edital.year}
                                </span>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit?.();
                                }}
                                disabled={isProcessing}
                                className="w-6 h-6 flex items-center justify-center text-content-muted hover:text-primary hover:bg-primary/10 rounded-md transition-all shrink-0 ml-1"
                                title="Editar edital"
                            >
                                <Edit2 size={14} />
                            </button>
                        </h3>
                        {displayPosition && (
                            <p className="text-[11px] text-content-muted font-bold tracking-tight mt-0.5 uppercase truncate">
                                {displayPosition}
                            </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-[9px] font-black uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-md border bg-secondary light:bg-slate-100 dark:bg-zinc-800 text-muted-foreground light:text-slate-600 dark:text-zinc-400 border-border dark:border-white/5">
                                {edital.sourceId ? 'SISTEMA' : edital.isImported ? 'IMPORTADO IA' : 'MANUAL'}
                            </span>
                            <span className="text-[10px] text-content-muted">•</span>
                            <span className="text-[10px] text-content-muted font-medium">{createdDate}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-secondary dark:bg-white/5 rounded-2xl p-3 border border-border dark:border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpen size={12} className="text-content-muted" />
                            <span className="text-[9px] font-bold text-content-muted uppercase tracking-widest">Progresso</span>
                        </div>
                        <div className="flex flex-col gap-1.5 mt-1">
                            {/* Tópicos */}
                            <div className="flex items-center gap-2">
                                <div className="text-base font-bold text-foreground leading-none">
                                    {metrics.completedTopics}<span className="text-[10px] text-content-muted font-bold ml-1 uppercase truncate">/{metrics.totalTopics} tópicos</span>
                                </div>
                            </div>
                            
                            {/* Matérias */}
                            <div className="flex items-center gap-2">
                                <div className="text-base font-bold text-foreground leading-none">
                                    {metrics.completedSubjectsCount || 0}<span className="text-[10px] text-content-muted font-bold ml-1 uppercase truncate">/{metrics.subjectsCount} matérias</span>
                                </div>
                            </div>
                        </div>
                        <div className="w-full h-1 bg-secondary dark:bg-zinc-800 rounded-full mt-2 overflow-hidden border border-border dark:border-white/5">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    <div className="bg-secondary dark:bg-white/5 rounded-2xl p-3 border border-border dark:border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                             <Timer size={12} className="text-content-muted/80" />
                            <span className="text-[9px] font-bold text-content-muted/80 uppercase tracking-widest">Tempo</span>
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
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-secondary dark:bg-zinc-800/80 border border-border dark:border-white/5 hover:bg-secondary-strong dark:hover:bg-zinc-700 text-content-muted hover:text-foreground dark:hover:text-content-main rounded-xl transition-all text-xs font-bold"
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
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-secondary dark:bg-zinc-800/80 border border-border dark:border-white/5 hover:bg-secondary-strong dark:hover:bg-zinc-700 text-content-muted hover:text-foreground rounded-xl transition-all text-xs font-bold"
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

                    {/* Botão Complementar - só para editais criados pelo usuário */}
                    {!edital.sourceId && (
                        <button
                            onClick={onComplement}
                            disabled={isProcessing}
                            className="w-full flex items-center justify-center gap-2 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl transition-all text-xs font-bold disabled:opacity-50"
                        >
                            <Plus size={14} />
                            Complementar Edital
                        </button>
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
