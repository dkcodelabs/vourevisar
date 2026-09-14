import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Trash2, Play, Eye, Clock,
    BookOpen, AlertTriangle, GraduationCap, BriefcaseBusiness, X, Loader2, RefreshCw,
    Edit2, Database, Sparkles, FileText, CalendarDays, MoreHorizontal
} from 'lucide-react';
import type { UserEdital } from '@/pages/Editais';

const ACRONYMS = new Set([
    'IDCAP', 'PCES', 'SEFAZ', 'INSS', 'IBGE', 'PF', 'PRF', 'TCU', 'CGU',
    'TJ', 'TRF', 'TRE', 'TRT', 'MP', 'MPSP', 'MPRJ', 'BACEN', 'STJ', 'STF',
    'PM', 'PC', 'CBM', 'SEAP', 'DETRAN', 'ANVISA', 'OAB', 'FGV', 'CEBRASPE',
    'VUNESP', 'FCC', 'AOCP', 'IBFC', 'IADES', 'FUNCAB', 'CESGRANRIO', 'IDAF',
    'SUS', 'CLT', 'TI', 'RH', 'DF', 'SP', 'RJ', 'MG', 'ES', 'RS', 'PR', 'SC',
    'BA', 'GO', 'PE', 'CE', 'PA', 'MA', 'MT', 'MS', 'RN', 'PB', 'PI', 'AL', 'SE', 'TO', 'RO', 'AC', 'AP', 'RR', 'AM'
]);

const LOWERCASE_WORDS = new Set([
    'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com', 'por', 'a', 'o', 'as', 'os', 'na', 'no', 'nas', 'nos'
]);

const formatProperCase = (text?: string | null): string => {
    if (!text) return '';
    const trimmed = text.trim();
    // If it already contains lowercase letters, respect the existing capitalization
    const hasLower = /[a-zà-ÿ]/.test(trimmed);
    const hasUpper = /[A-ZÀ-ß]/.test(trimmed);
    if (hasLower && hasUpper) return trimmed;

    return trimmed
        .toLowerCase()
        .split(/(\s+|[-–—/])/g)
        .map((segment, index) => {
            const clean = segment.trim();
            if (!clean) return segment;
            const upper = clean.toUpperCase();
            if (ACRONYMS.has(upper)) return upper;
            const lower = clean.toLowerCase();
            if (index > 0 && LOWERCASE_WORDS.has(lower)) return lower;
            return clean.charAt(0).toUpperCase() + clean.slice(1);
        })
        .join('');
};

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
        : edital.aiExtractionUsed
            ? {
                label: edital.sourceId ? 'Cópia + IA' : 'Cópia • IA',
                className: 'border-primary/20 bg-primary/10 text-primary',
                icon: Sparkles
            }
            : edital.sourceId
                ? {
                    label: 'Cópia • Catálogo',
                    className: 'border-primary/20 bg-primary/10 text-primary',
                    icon: Database
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
            className="group relative mx-auto flex h-full w-full max-w-[460px] flex-col overflow-hidden rounded-2xl border transition-all duration-300 border-border/80 bg-card shadow-[0_4px_20px_-8px_rgba(0,0,0,0.06)] hover:border-border-strong hover:shadow-[0_10px_28px_-8px_rgba(0,0,0,0.10)] dark:border-white/[0.10] dark:bg-gradient-to-b dark:from-[#1c1e26]/95 dark:via-[#181a22]/95 dark:to-[#13141b]/95 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_-10px_rgba(0,0,0,0.6)] dark:hover:border-white/[0.20] xl:mx-0"
        >
            {/* Destaque (Highlight) via Div Absoluta para evitar recortes */}
            {isHighlighted && (
                <div className="absolute inset-0 rounded-[inherit] ring-[2px] ring-primary shadow-[0_0_16px_rgba(59,130,246,0.3)] animate-pulse-subtle pointer-events-none z-50" />
            )}

            <div className="flex h-full flex-col p-4 md:p-5">
                <div className="relative mb-4 border-b border-border/70 pb-4 dark:border-white/[0.08]">
                    <div className="min-w-0">
                        <div className="flex min-w-0 flex-col gap-2">
                            <div className="flex min-w-0 items-start gap-2.5">
                                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                                    <GraduationCap size={15} />
                                </div>
                                <h3 className="line-clamp-2 text-sm font-bold leading-snug tracking-tight text-foreground sm:text-[15px] [overflow-wrap:anywhere]">
                                    {edital.year ? `${edital.year} • ` : ''}{formatProperCase(displayOrgan)}
                                </h3>
                            </div>
                            <div className="space-y-1 pl-9.5">
                                {displayPosition && (
                                    <p className="flex min-w-0 items-center gap-1.5 truncate text-xs font-medium text-muted-foreground">
                                        <BriefcaseBusiness size={12} className="shrink-0 text-amber-500 dark:text-amber-400" />
                                        <span className="truncate">{formatProperCase(displayPosition)}</span>
                                    </p>
                                )}
                                {edital.examBoard && (
                                    <p className="flex min-w-0 items-center gap-1.5 truncate text-xs font-medium text-muted-foreground">
                                        <GraduationCap size={12} className="shrink-0 text-primary/80" />
                                        <span className="truncate">{formatProperCase(edital.examBoard)}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="mt-3.5 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3 dark:border-white/[0.06]">
                        <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                            <CalendarDays size={13} className="shrink-0 text-muted-foreground/80" />
                            <span className="truncate">{examDateLabel}</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                            {edital.mergedIntoCycle && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    No ciclo
                                </span>
                            )}
                            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${sourceBadge.className}`}>
                                <SourceBadgeIcon size={11} />
                                {sourceBadge.label}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2">
                    {/* Card 1: Progresso */}
                    <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card/70 p-3.5 shadow-sm transition-all dark:border-white/[0.08] dark:bg-gradient-to-br dark:from-[#1b1e28]/90 dark:to-[#13151d]/90">
                        <div>
                            <div className="mb-2.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-blue-500/20 bg-blue-500/10 text-blue-500 dark:text-blue-400">
                                        <BookOpen size={13} />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Progresso</span>
                                </div>
                                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-black leading-none text-blue-600 dark:text-blue-400">
                                    {progress}%
                                </span>
                            </div>
                            <div className="space-y-1.5 py-1">
                                <div className="flex items-baseline justify-between text-xs">
                                    <span className="text-[11px] font-medium text-muted-foreground">Tópicos</span>
                                    <span className="text-xs font-bold text-foreground">
                                        {metrics.completedTopics} <span className="font-normal text-muted-foreground/70">/ {metrics.totalTopics}</span>
                                    </span>
                                </div>
                                <div className="flex items-baseline justify-between text-xs">
                                    <span className="text-[11px] font-medium text-muted-foreground">Matérias</span>
                                    <span className="text-xs font-bold text-foreground">
                                        {metrics.completedSubjectsCount || 0} <span className="font-normal text-muted-foreground/70">/ {metrics.subjectsCount}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary/80 dark:bg-white/10">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    progress > 0
                                        ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.35)]'
                                        : 'bg-transparent'
                                }`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Card 2: Tempo de Estudo */}
                    <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card/70 p-3.5 shadow-sm transition-all dark:border-white/[0.08] dark:bg-gradient-to-br dark:from-[#1b1e28]/90 dark:to-[#13151d]/90">
                        <div>
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-500 dark:text-amber-400">
                                        <Clock size={13} />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tempo</span>
                                </div>
                                <span className="rounded-full border border-border/60 bg-secondary/60 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]">
                                    {metrics.totalStudyMinutes > 0 ? 'Total' : '0h'}
                                </span>
                            </div>

                            <div className="py-1">
                                <div className="text-[26px] font-black leading-none tracking-tight tabular-nums text-foreground">
                                    {studyTimeLabel}
                                </div>
                                <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                                    {studyTimeCaption === 'sem registro' ? 'Sem registro' : 'Tempo de estudo'}
                                </p>
                            </div>
                        </div>

                        <div className="mt-3 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                            <span>{metrics.totalStudyMinutes > 0 ? 'Sessões registradas' : 'Inicie um estudo'}</span>
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

                <div className="mt-auto flex min-h-11 items-center justify-between gap-2 border-t border-border/70 pt-3 dark:border-white/[0.08]">
                    <div className="grid min-w-0 flex-1 grid-cols-2 items-center gap-2">
                        {metrics.subjectsCount > 0 ? (
                            <>
                                <button
                                    onClick={onViewSubjects}
                                    className="flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-secondary/50 px-2 text-[11px] font-semibold text-foreground transition-all duration-200 hover:border-border hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:px-3 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                                >
                                    <Eye size={13} className="shrink-0 text-muted-foreground" />
                                    <span className="truncate">Ver Matérias</span>
                                </button>
                                <button
                                    onClick={edital.mergedIntoCycle ? onUnloadCycle : onLoadCycle}
                                    disabled={isProcessing}
                                    className={`relative flex h-9 min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-xl px-2 text-[11px] font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-80 sm:px-3 ${
                                        edital.mergedIntoCycle
                                            ? 'border border-border/80 bg-secondary/30 text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-destructive/10'
                                            : 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
                                    }`}
                                >
                                    {isProcessing && processingProgress && (
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${processingProgress.percentage}%` }}
                                            className={`absolute inset-y-0 left-0 z-0 opacity-20 ${
                                                edital.mergedIntoCycle ? 'bg-destructive' : 'bg-white'
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
                                                <span className="truncate">Remover do ciclo</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play size={13} className="shrink-0 fill-current" />
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
                                    className="flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-secondary/50 px-2 text-[11px] font-semibold text-muted-foreground transition-all duration-200 hover:border-border hover:bg-secondary hover:text-foreground sm:px-3 dark:border-white/10 dark:bg-white/[0.04]"
                                >
                                    <Eye size={13} className="shrink-0" />
                                    <span className="truncate">Ver</span>
                                </button>

                                <div className="flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-2 text-center sm:px-3">
                                    <AlertTriangle size={13} className="shrink-0 text-amber-500" />
                                    <span className="truncate text-[10px] font-bold text-amber-500">Sem matérias</span>
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
                                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20 disabled:opacity-50 dark:text-emerald-400"
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
                                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                    className="absolute bottom-[calc(100%+8px)] right-0 z-20 flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/95 p-1.5 shadow-xl shadow-black/20 backdrop-blur-md dark:border-white/10 dark:bg-[#181a22]/95"
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowActions(false);
                                            onEdit?.();
                                        }}
                                        disabled={isProcessing}
                                        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-secondary/40 text-muted-foreground transition-colors duration-200 hover:border-border hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:hover:text-white"
                                        title="Editar edital"
                                        aria-label="Editar edital"
                                    >
                                        <Edit2 size={14} />
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowActions(false);
                                            onDelete();
                                        }}
                                        disabled={isProcessing}
                                        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 text-destructive transition-colors duration-200 hover:border-destructive/40 hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 disabled:opacity-50"
                                        title="Excluir edital"
                                        aria-label="Excluir edital"
                                    >
                                        {isProcessing && !edital.mergedIntoCycle ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <Trash2 size={14} />
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
                            className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                                showActions
                                    ? 'border-border-strong bg-secondary text-foreground'
                                    : 'border-border/80 bg-secondary/40 text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:hover:text-white'
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
