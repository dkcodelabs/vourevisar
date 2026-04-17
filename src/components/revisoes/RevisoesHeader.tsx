import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
    className?: string; // Support for custom styling positioning
}

export const RevisoesHeader: React.FC<RevisoesHeaderProps> = ({ stats, isCollapsed, onToggle, className }) => {
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
