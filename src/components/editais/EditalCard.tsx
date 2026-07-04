import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Trash2, Play, Eye, Clock,
    BookOpen, AlertTriangle, GraduationCap, BriefcaseBusiness, X, Loader2, RefreshCw,
    Edit2, Database, Sparkles, FileText, CalendarDays, MoreHorizontal
} from 'lucide-react';
import type { UserEdital } from '@/pages/Editais';
import {
    editalHeaderBadgeTypography,
    editalHeaderExamBoardTypography,
    editalHeaderPositionTypography
} from '@/components/editais/editalHeaderTypography';

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
    const [showActions, setShowActions] = React.useState(false);
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
        ? {
            label: 'Catálogo removido',
            className: 'border-warning/20 bg-warning/10 text-warning',
            icon: AlertTriangle
        }
        : edital.sourceId
            ? {
                label: 'Cópia • Catálogo',
                className: 'border-primary/20 bg-primary/10 text-primary',
                icon: Database
            }
            : edital.isImported
                ? {
                    label: 'Cópia • IA',
                    className: 'border-incidence/20 bg-incidence/10 text-incidence',
                    icon: Sparkles
                }
                : {
                    label: 'Manual',
                    className: 'border-border bg-secondary text-content-muted',
                    icon: FileText
                };
    const SourceBadgeIcon = sourceBadge.icon;

    // Procura por Órgão e Cargo estruturados ou faz o split do name como fallback
    const displayOrgan = edital.organ || edital.name.split(' - ')[0];
    const displayPosition = edital.position || (edital.name.split(' - ').length > 1 ? edital.name.split(' - ').slice(1).join(' - ') : null);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="glow-card group relative mx-auto flex h-full w-full max-w-[460px] flex-col overflow-hidden rounded-3xl border border-border bg-card transition-all duration-300 hover:border-border-strong dark:border-white/5 dark:bg-zinc-900/40 dark:hover:border-white/10 xl:mx-0"
        >
            {/* Destaque (Highlight) via Div Absoluta para evitar recortes */}
            {isHighlighted && (
                <div className="absolute inset-0 rounded-[inherit] ring-[3px] ring-primary shadow-[0_0_20px_rgba(14,165,233,0.3)] animate-pulse-subtle pointer-events-none z-50" />
            )}

            <div className="flex h-full flex-col p-4 md:p-5">
                <div className="relative mb-4 min-h-[118px] border-b border-border pb-4 dark:border-white/5">
                    <div className="min-w-0">
                        <div className="flex min-w-0 flex-col gap-2">
                            <div className="flex min-w-0 items-start gap-1.5">
                                <GraduationCap size={12} className="mt-[2px] shrink-0 text-primary" />
                                <h3 className="line-clamp-2 text-sm font-black uppercase leading-tight tracking-tight text-content-main [overflow-wrap:anywhere]">
                                    {edital.year ? `${edital.year} - ` : ''}{displayOrgan}
                                </h3>
                            </div>
                            <div className="min-h-[31px] space-y-1">
                                {displayPosition && (
                                    <p className={`flex min-w-0 items-center gap-1.5 truncate text-content-muted ${editalHeaderPositionTypography}`}>
                                        <BriefcaseBusiness size={11} className="shrink-0 text-warning" />
                                        <span className="truncate">{displayPosition}</span>
                                    </p>
                                )}
                                {edital.examBoard && (
                                    <p className={`flex min-w-0 items-center gap-1.5 truncate text-content-muted ${editalHeaderExamBoardTypography}`}>
                                        <GraduationCap size={11} className="shrink-0 text-incidence" />
                                        <span className="truncate">{edital.examBoard}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-medium text-content-muted">
                            <CalendarDays size={11} className="shrink-0 text-content-muted/80" />
                            <span className="truncate">{examDateLabel}</span>
                        </span>
                        <span className={`inline-flex shrink-0 items-center gap-0.5 rounded border px-1 py-px ${editalHeaderBadgeTypography} ${sourceBadge.className}`}>
                            <SourceBadgeIcon size={8} />
                            {sourceBadge.label}
                        </span>
                    </div>
                </div>

                <div className="mx-auto mb-4 grid w-full grid-cols-1 overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.09] via-background/70 to-incidence/[0.08] shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06),0_10px_30px_hsl(var(--primary)/0.05)] min-[360px]:w-[94%] min-[360px]:grid-cols-2 dark:border-primary/20 dark:from-primary/[0.10] dark:via-white/[0.025] dark:to-incidence/[0.08]">
                    <div className="flex min-h-[92px] flex-col px-3 py-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-1">
                                <BookOpen size={12} className="shrink-0 text-primary" />
                                <span className="whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.08em] text-content-muted sm:text-[9px] sm:tracking-[0.14em]">Progresso</span>
                            </div>
                            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[8px] font-bold leading-none text-primary sm:text-[9px]">
                                {progress}%
                            </span>
                        </div>
                        <div className="flex flex-1 flex-col justify-center gap-1">
                            <div className="flex items-baseline justify-between gap-2">
                                <span className="text-[11px] font-bold leading-none text-content-main">Tópicos</span>
                                <span className="text-[11px] font-black leading-none text-content-main">
                                    {metrics.completedTopics}<span className="font-bold text-content-muted">/{metrics.totalTopics}</span>
                                </span>
                            </div>
                            <div className="flex items-baseline justify-between gap-2">
                                <span className="text-[11px] font-bold leading-none text-content-muted">Matérias</span>
                                <span className="text-[11px] font-black leading-none text-content-main">
                                    {metrics.completedSubjectsCount || 0}<span className="font-bold text-content-muted">/{metrics.subjectsCount}</span>
                                </span>
                            </div>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-content-muted/15">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    progress > 0
                                        ? 'bg-gradient-to-r from-primary via-sky-400 to-incidence'
                                        : 'bg-content-muted/25'
                                }`}
                                style={{ width: progress > 0 ? `max(${progress}%, 8px)` : '8px' }}
                            />
                        </div>
                    </div>
                    
                    <div className="flex min-h-[92px] flex-col border-t border-border/70 px-3 py-3 min-[360px]:border-l min-[360px]:border-t-0 dark:border-white/10">
                        <div className="mb-2 flex items-center gap-1.5">
                            <Clock
                                size={12}
                                className={`shrink-0 ${
                                    metrics.totalStudyMinutes > 0 ? 'text-primary' : 'text-content-muted'
                                }`}
                            />
                            <span className="truncate text-[9px] font-bold uppercase tracking-[0.16em] text-content-muted">Tempo</span>
                        </div>
                        <div className="flex flex-1 flex-col justify-center">
                            <div
                                className={`font-black leading-none tabular-nums ${
                                    metrics.totalStudyMinutes > 0
                                        ? 'text-[24px] text-primary'
                                        : 'text-[22px] text-content-muted'
                                }`}
                            >
                                {studyTimeLabel}
                            </div>
                            <p className="mt-1 text-[10px] font-bold leading-none text-content-muted">
                                {studyTimeCaption === 'sem registro' ? 'Sem registro' : 'Tempo de estudo'}
                            </p>
                        </div>
                    </div>
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

                <div className="mt-auto flex min-h-11 items-center justify-between gap-2 border-t border-border/80 pt-3 dark:border-white/5">
                    <div className="grid min-w-0 flex-1 grid-cols-2 items-center gap-2">
                        {metrics.subjectsCount > 0 ? (
                            <>
                                <button
                                    onClick={onViewSubjects}
                                    className="flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-primary/25 bg-primary/[0.08] px-2 text-[10px] font-bold text-primary transition-colors duration-200 hover:border-primary/40 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:px-3"
                                >
                                    <Eye size={13} className="shrink-0" />
                                    <span className="truncate">Ver Matérias</span>
                                </button>
                                <button
                                    onClick={edital.mergedIntoCycle ? onUnloadCycle : onLoadCycle}
                                    disabled={isProcessing}
                                    className={`relative flex h-8 min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-lg px-2 text-[10px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-80 sm:px-3 ${
                                        edital.mergedIntoCycle
                                            ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400'
                                            : 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90'
                                    }`}
                                >
                                    {isProcessing && processingProgress && (
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${processingProgress.percentage}%` }}
                                            className={`absolute inset-y-0 left-0 z-0 opacity-20 ${
                                                edital.mergedIntoCycle ? 'bg-red-500' : 'bg-white'
                                            }`}
                                        />
                                    )}

                                    <span className="relative z-10 flex min-w-0 items-center justify-center gap-1.5">
                                        {isProcessing ? (
                                            <>
                                                <Loader2 size={13} className="shrink-0 animate-spin" />
                                                <span className="truncate">{processingProgress ? `${processingProgress.percentage}%` : ''}</span>
                                            </>
                                        ) : edital.mergedIntoCycle ? (
                                            <>
                                                <X size={13} className="shrink-0" />
                                                <span className="truncate">Remover</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play size={13} className="shrink-0" />
                                                <span className="truncate">Carregar Ciclo</span>
                                            </>
                                        )}
                                    </span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={onViewSubjects}
                                    className="flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-2 text-[10px] font-bold text-content-muted transition-colors hover:bg-secondary-strong hover:text-foreground sm:px-3 dark:border-white/5 dark:bg-zinc-800/50 dark:hover:bg-zinc-700"
                                >
                                    <Eye size={13} className="shrink-0" />
                                    <span className="truncate">Ver</span>
                                </button>

                                <div className="flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 text-center sm:px-3">
                                    <AlertTriangle size={13} className="shrink-0 text-amber-400" />
                                    <span className="truncate text-[10px] font-bold text-amber-400">Sem matérias</span>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="relative flex shrink-0 items-center gap-2">
                        {edital.sourceId && hasUpdate && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSync?.();
                                }}
                                disabled={isProcessing}
                                className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-success/40 bg-success text-success-foreground transition-colors after:absolute after:-inset-1.5 disabled:opacity-50"
                                title="Atualização disponível!"
                                aria-label="Sincronizar atualização do edital"
                            >
                                {isProcessing && edital.sourceId ? (
                                    <Loader2 size={15} className="animate-spin" />
                                ) : (
                                    <RefreshCw size={15} className="animate-spin-slow" />
                                )}
                            </button>
                        )}

                        <AnimatePresence initial={false}>
                            {showActions && (
                                <motion.div
                                    initial={{ opacity: 0, x: 10, scale: 0.96 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 10, scale: 0.96 }}
                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                    className="absolute bottom-[calc(100%+8px)] right-0 z-20 flex items-center gap-2 rounded-xl border border-border/80 bg-card/95 p-1.5 shadow-xl shadow-black/20 backdrop-blur-md dark:border-white/10"
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowActions(false);
                                            onEdit?.();
                                        }}
                                        disabled={isProcessing}
                                        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.08] text-primary transition-colors duration-200 after:absolute after:-inset-1.5 hover:border-primary/40 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50"
                                        title="Editar edital"
                                        aria-label="Editar edital"
                                    >
                                        <Edit2 size={15} />
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowActions(false);
                                            onDelete();
                                        }}
                                        disabled={isProcessing}
                                        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive transition-colors duration-200 after:absolute after:-inset-1.5 hover:border-destructive/50 hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 disabled:opacity-50"
                                        title="Excluir edital"
                                        aria-label="Excluir edital"
                                    >
                                        {isProcessing && !edital.mergedIntoCycle ? (
                                            <Loader2 size={15} className="animate-spin" />
                                        ) : (
                                            <Trash2 size={15} />
                                        )}
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowActions((current) => !current);
                            }}
                            className={`relative flex h-8 w-8 items-center justify-center rounded-lg border transition-colors duration-200 after:absolute after:-inset-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-incidence/50 ${
                                showActions
                                    ? 'border-incidence/35 bg-incidence/15 text-incidence'
                                    : 'border-incidence/20 bg-incidence/[0.07] text-incidence/80 hover:border-incidence/35 hover:bg-incidence/15 hover:text-incidence'
                            }`}
                            aria-label={showActions ? 'Ocultar ações do edital' : 'Mostrar ações do edital'}
                            aria-expanded={showActions}
                            title={showActions ? 'Ocultar ações' : 'Mais ações'}
                        >
                            <MoreHorizontal size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
