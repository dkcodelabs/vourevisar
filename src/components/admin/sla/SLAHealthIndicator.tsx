import React from 'react';
import { Activity, CheckCircle2 } from 'lucide-react';

interface SLAHealthIndicatorProps {
    responseOnTimePct: number;
    resolutionOnTimePct: number;
}

export const SLAHealthIndicator: React.FC<SLAHealthIndicatorProps> = ({
    responseOnTimePct,
    resolutionOnTimePct,
}) => {
    const getHealthStatus = (pct: number) => {
        if (pct >= 90) {
            return {
                label: 'Saudável',
                color: 'text-green-600',
                bg: 'bg-green-50 dark:bg-green-900/20',
                border: 'border-green-300',
                icon: '🟢',
            };
        }
        if (pct >= 75) {
            return {
                label: 'Atenção',
                color: 'text-amber-600',
                bg: 'bg-amber-50 dark:bg-amber-900/20',
                border: 'border-amber-300',
                icon: '🟡',
            };
        }
        return {
            label: 'Crítico',
            color: 'text-red-600',
            bg: 'bg-red-50 dark:bg-red-900/20',
            border: 'border-red-300',
            icon: '🔴',
        };
    };

    const responseHealth = getHealthStatus(responseOnTimePct);
    const resolutionHealth = getHealthStatus(resolutionOnTimePct);

    return (
        <div className="h-full glow-card p-4 sm:p-5 rounded-3xl flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Activity size={16} className="text-blue-500" />
                Saúde do SLA
            </h3>

            <div className="flex-1 flex flex-col gap-3 justify-center">
                {/* Saúde de Resposta */}
                <div
                    className={`${responseHealth.bg} border ${responseHealth.border} rounded-xl p-4 transition-all hover:shadow-sm flex flex-col justify-center`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Resposta</p>
                        <span className="text-lg">{responseHealth.icon}</span>
                    </div>
                    <p className={`text-xl sm:text-2xl font-bold ${responseHealth.color}`}>
                        {responseHealth.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        {responseOnTimePct.toFixed(1)}% no prazo
                    </p>
                </div>

                {/* Saúde de Resolução */}
                <div
                    className={`${resolutionHealth.bg} border ${resolutionHealth.border} rounded-xl p-4 transition-all hover:shadow-sm flex flex-col justify-center`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Resolução</p>
                        <span className="text-lg">{resolutionHealth.icon}</span>
                    </div>
                    <p className={`text-xl sm:text-2xl font-bold ${resolutionHealth.color}`}>
                        {resolutionHealth.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        {resolutionOnTimePct.toFixed(1)}% no prazo
                    </p>
                </div>
            </div>
        </div>
    );
};
