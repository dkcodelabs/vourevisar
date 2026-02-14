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
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                <Activity size={16} className="text-blue-500" />
                Saúde do SLA
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Saúde de Resposta */}
                <div
                    className={`${responseHealth.bg} border ${responseHealth.border} rounded-lg p-3 transition-all hover:shadow-sm`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-slate-500 uppercase">Resposta</p>
                        <span className="text-lg">{responseHealth.icon}</span>
                    </div>
                    <p className={`text-xl font-bold ${responseHealth.color}`}>
                        {responseHealth.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {responseOnTimePct.toFixed(1)}% no prazo
                    </p>
                </div>

                {/* Saúde de Resolução */}
                <div
                    className={`${resolutionHealth.bg} border ${resolutionHealth.border} rounded-lg p-3 transition-all hover:shadow-sm`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-slate-500 uppercase">Resolução</p>
                        <span className="text-lg">{resolutionHealth.icon}</span>
                    </div>
                    <p className={`text-xl font-bold ${resolutionHealth.color}`}>
                        {resolutionHealth.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {resolutionOnTimePct.toFixed(1)}% no prazo
                    </p>
                </div>
            </div>
        </div>
    );
};
