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

    return `${pace.daysRemaining} dias para a prova, ${pace.unstartedTopics} tópicos novos pendentes e ${pace.pendingReviews} revisões previstas.`;
};

const getRecentPaceText = (pace: StudyCyclePaceMetrics) => {
    const recent = pace.recentFirstContact;
    if (recent.state === 'ready' && recent.projectedDaysToFirstContact !== null) {
        return `Ritmo recente: ${formatPaceValue(recent.topicsPerDay)}. Primeiro contato fecha em cerca de ${recent.projectedDaysToFirstContact} dias se esse ritmo continuar.`;
    }

    if (recent.averageStudyMinutes !== null) {
        return `Tempo médio real por primeiro contato: ${Math.round(recent.averageStudyMinutes)} min. Ainda falta histórico recente para projetar fechamento.`;
    }

    return `Histórico recente insuficiente: ${recent.topicsStarted} primeiro${recent.topicsStarted === 1 ? '' : 's'} contato${recent.topicsStarted === 1 ? '' : 's'} nos últimos ${recent.windowDays} dias.`;
};

export const RevisoesHeader: React.FC<RevisoesHeaderProps> = ({ stats, isCollapsed, onToggle, pace, className }) => {
    const paceSummary = getPaceSummary(pace);

    return (
        <div className={`w-full ${className || ''}`}>
            {/* Toggle Button Row */}
            <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs font-bold text-content-muted uppercase tracking-wider">
                    Visão Geral
                </h3>
                <button
                    onClick={() => onToggle(!isCollapsed)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-secondary hover:bg-accent rounded-lg transition-all"
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
                <div className="mb-4 grid gap-2 rounded-2xl border border-border/70 bg-card/70 p-3 shadow-sm sm:grid-cols-[1.15fr_0.85fr]">
                    <div className="flex min-w-0 items-start gap-2.5">
                        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                            <Gauge size={16} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                                Ritmo até a prova
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-content-muted">
                                {paceSummary}
                            </p>
                            <p className="mt-1 text-[11px] leading-relaxed text-content-muted/90">
                                {getRecentPaceText(pace)}
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-border/60 bg-surface/60 px-3 py-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-content-muted">
                                <Target size={12} />
                                Tópicos
                            </div>
                            <p className="mt-1 text-sm font-bold tabular-nums text-foreground">
                                {formatPaceValue(pace.newTopicsPerDay)}
                            </p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-surface/60 px-3 py-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-content-muted">
                                <CalendarDays size={12} />
                                Revisões
                            </div>
                            <p className="mt-1 text-sm font-bold tabular-nums text-foreground">
                                {formatPaceValue(pace.reviewsPerDay)}
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
