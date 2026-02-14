import React from 'react';
import { TrendingUp, TrendingDown, Clock, CheckCircle2, AlertTriangle, Inbox } from 'lucide-react';

interface SLAKPICardsProps {
    totalFeedbacks: number;
    responseOnTimePct: number;
    resolutionOnTimePct: number;
    avgFirstResponseHours: number;
    avgResolutionDays: number;
    breachedPct: number;
}

export const SLAKPICards: React.FC<SLAKPICardsProps> = ({
    totalFeedbacks,
    responseOnTimePct,
    resolutionOnTimePct,
    avgFirstResponseHours,
    avgResolutionDays,
    breachedPct,
}) => {
    const getPercentageColor = (pct: number) => {
        if (pct >= 90) return { text: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' };
        if (pct >= 75) return { text: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' };
        return { text: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' };
    };

    const responseColors = getPercentageColor(responseOnTimePct);
    const resolutionColors = getPercentageColor(resolutionOnTimePct);
    const breachedColors = getPercentageColor(100 - breachedPct);

    const kpis = [
        {
            label: 'Total de Feedbacks',
            value: totalFeedbacks.toString(),
            icon: <Inbox size={18} />,
            color: 'text-slate-700 dark:text-slate-300',
            bg: 'bg-white dark:bg-slate-800',
        },
        {
            label: '% SLA Resposta',
            value: `${responseOnTimePct.toFixed(1)}%`,
            icon: <TrendingUp size={18} />,
            color: responseColors.text,
            bg: responseColors.bg,
        },
        {
            label: '% SLA Resolução',
            value: `${resolutionOnTimePct.toFixed(1)}%`,
            icon: <CheckCircle2 size={18} />,
            color: resolutionColors.text,
            bg: resolutionColors.bg,
        },
        {
            label: 'Tempo Médio Resposta',
            value: `${avgFirstResponseHours.toFixed(1)}h`,
            icon: <Clock size={18} />,
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
            label: 'Tempo Médio Resolução',
            value: `${avgResolutionDays.toFixed(1)}d`,
            icon: <Clock size={18} />,
            color: 'text-purple-600',
            bg: 'bg-purple-50 dark:bg-purple-900/20',
        },
        {
            label: '% Estourados',
            value: `${breachedPct.toFixed(1)}%`,
            icon: <AlertTriangle size={18} />,
            color: breachedColors.text,
            bg: breachedColors.bg,
        },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpis.map((kpi, idx) => (
                <div
                    key={idx}
                    className={`${kpi.bg} rounded-xl p-3 border border-slate-200 dark:border-slate-700 transition-all hover:shadow-md`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">
                            {kpi.label}
                        </p>
                        <span className={kpi.color}>{kpi.icon}</span>
                    </div>
                    <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </div>
            ))}
        </div>
    );
};
