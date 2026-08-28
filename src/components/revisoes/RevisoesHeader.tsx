import React from 'react';
import { CalendarDays, ChevronDown, ChevronUp, Gauge, Target } from 'lucide-react';
import type { StudyCyclePaceMetrics } from '@/utils/studyCycleMetrics';

interface RevisoesHeaderProps {
    stats: {
        today: number;
        overdue: number;
        future: number;
        completedTopicsCount: number;
        completedReviews: number;
        totalScheduledReviews: number;
    };
    isCollapsed: boolean;
    onToggle: (collapsed: boolean) => void;
    pace?: StudyCyclePaceMetrics;
    cycleTitle?: string;
    onOpenExamDateEditor?: () => void;
    className?: string; // Support for custom styling positioning
}

const formatPaceValue = (value: number | null) => {
    if (value === null) return '--';
    if (value > 0 && value < 1) {
        const intervalDays = Math.max(2, Math.round(1 / value));
        return `1 a cada ${intervalDays} dias`;
    }

    return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/dia`;
};

const getPaceSummary = (pace?: StudyCyclePaceMetrics) => {
    if (!pace) return null;
    if (pace.state !== 'ready') return pace.explanation;

    return `${pace.daysRemaining} dias para a prova · ${pace.unstartedTopics} tópicos novos e ${pace.totalPlannedReviews} revisões para concluir e consolidar 100% do edital.`;
};

const getRecentPaceText = (pace: StudyCyclePaceMetrics) => {
    const recent = pace.recentFirstContact;
    if (recent.state === 'ready' && recent.projectedDaysToFirstContact !== null) {
        return `Histórico real recente: ${recent.topicsStarted} tópicos iniciados nos últimos ${recent.windowDays} dias (${formatPaceValue(recent.topicsPerDay)}). No ritmo histórico atual, fecharia os tópicos restantes em ~${recent.projectedDaysToFirstContact} dias.`;
    }

    if (recent.averageStudyMinutes !== null) {
        return `Tempo médio real por primeiro contato: ${Math.round(recent.averageStudyMinutes)} min.`;
    }

    return `Histórico recente insuficiente: ${recent.topicsStarted} primeiro${recent.topicsStarted === 1 ? '' : 's'} contato${recent.topicsStarted === 1 ? '' : 's'} nos últimos ${recent.windowDays} dias.`;
};

export const RevisoesHeader: React.FC<RevisoesHeaderProps> = ({ stats, isCollapsed, onToggle, pace, cycleTitle, onOpenExamDateEditor, className }) => {
    const paceSummary = getPaceSummary(pace);
    const isExamDateMissing = !pace || pace.state === 'missing_exam_date' || pace.state === 'missing_cycle';

    return (
        <div className={`w-full ${className || ''}`}>
            {/* Toggle Button Row */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                    <h3 className="text-xs font-bold text-content-muted uppercase tracking-wider shrink-0">
                        Visão Geral
                    </h3>
                    {cycleTitle && (
                        <span className="text-xs font-semibold text-foreground truncate" title={cycleTitle}>
                            · {cycleTitle}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => onToggle(!isCollapsed)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-secondary hover:bg-accent rounded-lg transition-all shrink-0"
                    title={isCollapsed ? 'Expandir cards' : 'Minimizar cards'}
                >
                    {isCollapsed ? (
                        <>
                            <ChevronDown size={14} />
                            <span>Expandir</span>
                        </>
                    ) : (
                        <>
                            <ChevronUp size={14} />
                            <span>Minimizar</span>
                        </>
                    )}
                </button>
            </div>

            {pace && (
                <div className="mb-4 grid gap-3 rounded-2xl border border-border/70 bg-card/70 p-3.5 shadow-sm lg:grid-cols-[1.1fr_1fr]">
                    <div className="flex min-w-0 items-start gap-2.5">
                        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                            <Gauge size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                                    Ritmo até a prova
                                </p>
                                {onOpenExamDateEditor && (
                                    <button
                                        type="button"
                                        onClick={onOpenExamDateEditor}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all cursor-pointer shrink-0"
                                    >
                                        <CalendarDays size={13} />
                                        {isExamDateMissing ? 'Definir data da prova' : 'Alterar data'}
                                    </button>
                                )}
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-content-muted">
                                {paceSummary}
                            </p>
                            <p className="mt-1 text-[11px] leading-relaxed text-content-muted/90">
                                {getRecentPaceText(pace)}
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl border border-border/60 bg-surface/60 px-2.5 py-2">
                            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-content-muted truncate">
                                <Target size={11} className="shrink-0" />
                                <span className="truncate">Novos</span>
                            </div>
                            <p className="mt-1 text-xs sm:text-sm font-bold tabular-nums text-foreground">
                                {pace.state === 'ready'
                                    ? formatPaceValue(pace.newTopicsPerDay)
                                    : `${pace.unstartedTopics} novos`}
                            </p>
                            <p className="text-[10px] text-content-muted truncate mt-0.5">
                                {pace.state === 'ready' ? `${pace.unstartedTopics} restantes` : '1º contato'}
                            </p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-surface/60 px-2.5 py-2">
                            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-content-muted truncate">
                                <CalendarDays size={11} className="shrink-0" />
                                <span className="truncate">Revisões</span>
                            </div>
                            <p className="mt-1 text-xs sm:text-sm font-bold tabular-nums text-foreground">
                                {pace.state === 'ready'
                                    ? formatPaceValue(pace.reviewsPerDay)
                                    : `${pace.pendingReviews} hoje`}
                            </p>
                            <p className="text-[10px] text-content-muted truncate mt-0.5">
                                {pace.state === 'ready' ? `${pace.totalPlannedReviews} programa` : 'pendentes'}
                            </p>
                        </div>
                        <div className="rounded-xl border border-primary/20 bg-primary/5 px-2.5 py-2">
                            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary truncate">
                                <Gauge size={11} className="shrink-0" />
                                <span className="truncate">Meta Total</span>
                            </div>
                            <p className="mt-1 text-xs sm:text-sm font-bold tabular-nums text-primary">
                                {pace.state === 'ready' && pace.totalDailyWorkload !== null
                                    ? `~${formatPaceValue(pace.totalDailyWorkload)}`
                                    : '--'}
                            </p>
                            <p className="text-[10px] text-primary/80 truncate mt-0.5">
                                {pace.state === 'ready' ? 'estudos/dia' : 'combinado'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Collapsed Summary Bar - Shown when Collapsed (Desktop) OR Always on Mobile as KPI Summary */}
            {/* Logic Refinement: In the new Mobile-First layout, this might represent the primary KPI view on mobile. */}
            {/* But for now, we follow the prop `isCollapsed`. */}

            {isCollapsed && (
                <div className="glass-card rounded-2xl p-4 mb-4 relative group">
                    <div className="flex items-center justify-around gap-4 flex-wrap pr-10">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                            <span className="text-xs text-content-muted">Hoje & Atrasadas:</span>
                            <span className="text-sm font-bold text-foreground">{stats.today + stats.overdue}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-xs text-content-muted">Futuras:</span>
                            <span className="text-sm font-bold text-foreground">{stats.future}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-xs text-content-muted">Concluídas:</span>
                            <span className="text-sm font-bold text-foreground">{stats.completedTopicsCount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                            <span className="text-xs text-content-muted">Revisões Feitas:</span>
                            <span className="text-sm font-bold text-foreground">{stats.completedReviews}</span>
                        </div>
                    </div>
                    {/* Integrated Expand Button */}
                    <button
                        onClick={() => onToggle(false)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-primary"
                        title="Expandir estatísticas"
                    >
                        <ChevronDown size={20} />
                    </button>
                </div>
            )}
        </div>
    );
};
