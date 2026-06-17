import React from 'react';
import { motion } from 'framer-motion';
import {
    Trash2, Play, Eye, Clock,
    BookOpen, AlertTriangle, GraduationCap, BriefcaseBusiness, X, Loader2, RefreshCw,
    Edit2
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
    processingProgress?: { percentage: number; message: string };
    hasUpdate?: boolean;
    sourceAvailable?: boolean;
    sourceStatusKnown?: boolean;
    onSync?: () => void;
    onEdit?: () => void;
    isHighlighted?: boolean;
}

export const EditalCard = ({
    edital, metrics, daysLeft, isSelected,
    onToggleSelect, onViewSubjects, onLoadCycle, onUnloadCycle, onDelete,
    isProcessing = false, processingProgress, hasUpdate = false, sourceAvailable = false, sourceStatusKnown = false, onSync, onEdit, isHighlighted = false
}: EditalCardProps) => {
    const progress = metrics.totalTopics > 0
        ? Math.round((metrics.completedTopics / metrics.totalTopics) * 100)
        : 0;

    const hours = Math.floor(metrics.totalStudyMinutes / 60);
    const mins = metrics.totalStudyMinutes % 60;
    const studyTimeLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    const studyTimeCaption = metrics.totalStudyMinutes > 0 ? 'tempo de estudo' : 'sem registro';
    const examDateLabel = edital.examDate
        ? `Prova ${new Date(edital.examDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}`
        : 'Sem data da prova';
    const sourceBadge = edital.sourceId && sourceStatusKnown && !sourceAvailable
        ? { label: 'Catálogo removido', className: 'text-warning' }
        : edital.sourceId
            ? { label: 'Cópia • Catálogo', className: 'text-primary' }
            : edital.isImported
                ? { label: 'Cópia • IA', className: 'text-incidence' }
                : { label: 'Manual', className: 'text-content-muted' };

    // Procura por Órgão e Cargo estruturados ou faz o split do name como fallback
    const displayOrgan = edital.organ || edital.name.split(' - ')[0];
    const displayPosition = edital.position || (edital.name.split(' - ').length > 1 ? edital.name.split(' - ').slice(1).join(' - ') : null);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="glow-card group relative flex h-full w-full max-w-[420px] mx-auto flex-col overflow-hidden rounded-3xl border border-border bg-card transition-all duration-300 hover:border-border-strong dark:border-white/5 dark:bg-zinc-900/40 dark:hover:border-white/10 xl:mx-0"
        >
            {/* Destaque (Highlight) via Div Absoluta para evitar recortes */}
            {isHighlighted && (
                <div className="absolute inset-0 rounded-[inherit] ring-[3px] ring-primary shadow-[0_0_20px_rgba(14,165,233,0.3)] animate-pulse-subtle pointer-events-none z-50" />
            )}

            <div className="flex h-full flex-col p-4 md:p-5">
                <div className="relative mb-3 h-[104px] border-b border-border pb-3 dark:border-white/5">
                    <div className="min-w-0">
                        <div className="flex min-w-0 flex-col">
                            <h3 className="line-clamp-2 text-[13px] font-black uppercase leading-tight tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-[14px]">
                                {edital.year ? `${edital.year} - ` : ''}{displayOrgan}
                            </h3>
                            <div className="mt-1 min-h-[31px] space-y-0.5">
                                {displayPosition && (
                                    <p className="flex items-center gap-1.5 truncate text-[10px] font-bold uppercase tracking-tight text-content-muted">
                                        <BriefcaseBusiness size={11} className="shrink-0 text-content-muted/80" />
                                        <span className="truncate">{displayPosition}</span>
                                    </p>
                                )}
                                {edital.examBoard && (
                                    <p className="flex items-center gap-1.5 truncate text-[10px] font-black uppercase tracking-[0.10em] text-primary/80">
                                        <GraduationCap size={11} className="shrink-0" />
                                        <span className="truncate">{edital.examBoard}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="absolute bottom-3 left-0">
                        <span className="text-[10px] font-medium text-content-muted">{examDateLabel}</span>
                    </div>
                </div>

                <div className="mx-auto mb-4 grid w-[94%] grid-cols-2 gap-3">
                    <div className="flex min-h-[74px] flex-col rounded-2xl border border-border/80 bg-gradient-to-b from-background/95 to-background/70 px-3 py-2.5 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)] dark:border-white/5 dark:from-white/[0.045] dark:to-white/[0.025]">
                        <div className="mb-1.5 flex items-center justify-start gap-2">
                            <BookOpen size={12} className="text-content-muted" />
                            <span className="text-[9px] font-bold text-content-muted uppercase tracking-widest">Progresso</span>
                        </div>
                        <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
                            <div className="flex items-center justify-center gap-2">
                                <div className="text-[10px] font-bold leading-none text-foreground">
                                    {metrics.completedTopics}<span className="ml-1 truncate text-content-muted">/{metrics.totalTopics} Tópicos</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-center gap-2">
                                <div className="text-[10px] font-bold leading-none text-foreground">
                                    {metrics.completedSubjectsCount || 0}<span className="ml-1 truncate text-content-muted">/{metrics.subjectsCount} Matérias</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-content-muted/15">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    progress > 0 ? 'bg-success' : 'bg-transparent'
                                }`}
                                style={{ width: progress > 0 ? `max(${progress}%, 6px)` : '0%' }}
                            />
                        </div>
                    </div>
                    
                    <div className="flex min-h-[74px] flex-col rounded-2xl border border-border/80 bg-gradient-to-b from-background/95 to-background/70 px-3 py-2.5 text-center shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)] dark:border-white/5 dark:from-white/[0.045] dark:to-white/[0.025]">
                        <div className="mb-1.5 flex items-center justify-start gap-2">
                            <Clock size={12} className="text-content-muted" />
                            <span className="text-[9px] font-bold text-content-muted/80 uppercase tracking-widest">Tempo</span>
                        </div>
                        <div className="flex flex-1 flex-col items-center justify-center">
                            <div className="text-[20px] font-black text-sky-400 leading-none">
                                {studyTimeLabel}
                            </div>
                            <p className="mt-1 text-[10px] font-bold tracking-tight text-content-muted">
                                {studyTimeCaption === 'sem registro' ? 'Sem registro' : 'Tempo de estudo'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mx-auto mb-3 grid w-[92%] grid-cols-2 gap-3 justify-center">
                    {metrics.subjectsCount > 0 ? (
                        <>
                            <button
                                onClick={onViewSubjects}
                                className="flex items-center justify-center gap-2 py-1.5 bg-secondary dark:bg-zinc-800/80 border border-border dark:border-white/5 hover:bg-secondary-strong dark:hover:bg-zinc-700 text-content-muted hover:text-foreground dark:hover:text-content-main rounded-xl transition-all text-xs font-bold"
                            >
                                <Eye size={14} />
                                Ver Matérias
                            </button>
                            <button
                                onClick={edital.mergedIntoCycle ? onUnloadCycle : onLoadCycle}
                                disabled={isProcessing}
                                className={`relative flex items-center justify-center gap-2 py-1.5 rounded-xl transition-all text-xs font-bold shadow-lg overflow-hidden disabled:opacity-80 disabled:cursor-not-allowed ${
                                    edital.mergedIntoCycle
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 shadow-none'
                                        : 'bg-primary hover:bg-primary/90 text-white shadow-primary/20'
                                }`}
                            >
                                {/* Background Fill Animation */}
                                {isProcessing && processingProgress && (
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${processingProgress.percentage}%` }}
                                        className={`absolute inset-y-0 left-0 z-0 opacity-20 ${
                                            edital.mergedIntoCycle ? 'bg-red-500' : 'bg-white'
                                        }`}
                                    />
                                )}

                                <div className="relative z-10 flex items-center justify-center gap-2">
                                    {isProcessing ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            {processingProgress ? `${processingProgress.percentage}%` : ''}
                                        </>
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
                                </div>
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={onViewSubjects}
                                className="flex items-center justify-center gap-2 py-1.5 bg-secondary dark:bg-zinc-800/80 border border-border dark:border-white/5 hover:bg-secondary-strong dark:hover:bg-zinc-700 text-content-muted hover:text-foreground rounded-xl transition-all text-xs font-bold"
                            >
                                <Eye size={14} />
                                Ver
                            </button>

                            <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                                <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                                <span className="text-[11px] font-bold text-amber-400 leading-tight">Sem matérias</span>
                            </div>
                        </>
                    )}
                </div>


                {/* Detalhes do Progresso de Remoção */}
                {isProcessing && processingProgress?.message && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 overflow-hidden px-1"
                    >
                        <p className="text-[10px] text-content-muted font-bold tracking-tight uppercase animate-pulse flex items-center gap-1.5">
                            <RefreshCw size={10} className="animate-spin-slow text-primary/60" />
                            {processingProgress.message}...
                        </p>
                    </motion.div>
                )}

                <div className="mt-auto flex min-h-11 items-center justify-between gap-3 border-t border-border/80 pt-3 dark:border-white/5">
                    <span className={`min-w-0 truncate text-[9px] font-black uppercase tracking-[0.15em] ${sourceBadge.className}`}>
                        <span className="pl-2">{sourceBadge.label}</span>
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                        {edital.sourceId && hasUpdate && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSync?.();
                                }}
                                disabled={isProcessing}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-success/40 bg-success text-success-foreground transition-colors disabled:opacity-50"
                                title="Atualização disponível!"
                            >
                                {isProcessing && edital.sourceId ? (
                                    <Loader2 size={15} className="animate-spin" />
                                ) : (
                                    <RefreshCw size={15} className="animate-spin-slow" />
                                )}
                            </button>
                        )}

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit?.();
                            }}
                            disabled={isProcessing}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary/50 text-content-muted transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50 dark:border-white/5 dark:bg-zinc-800/50"
                            title="Editar edital"
                        >
                            <Edit2 size={15} />
                        </button>

                        <button
                            onClick={onDelete}
                            disabled={isProcessing}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary/50 text-content-muted transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 dark:border-white/5 dark:bg-zinc-800/50"
                            title="Excluir edital"
                        >
                            {isProcessing && !edital.mergedIntoCycle ? (
                                <Loader2 size={15} className="animate-spin text-destructive" />
                            ) : (
                                <Trash2 size={15} />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
