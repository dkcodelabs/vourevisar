import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FEEDBACK_LABELS } from '@/services/feedbackService';

interface SLADistributionChartsProps {
    byStatus: Record<string, number>;
    byType: Record<string, number>;
}

export const SLADistributionCharts: React.FC<SLADistributionChartsProps> = ({ byStatus, byType }) => {
    // Preparar dados para status
    const statusData = Object.entries(byStatus).map(([key, value]) => ({
        name: FEEDBACK_LABELS[key as keyof typeof FEEDBACK_LABELS] || key,
        count: value,
    }));

    // Preparar dados para tipo
    const typeLabels: Record<string, string> = {
        melhoria: 'Melhoria',
        nova_funcionalidade: 'Nova Funcionalidade',
        problema: 'Problema',
        improvement: 'Melhoria',
        feature_request: 'Nova Funcionalidade',
        ux_issue: 'Problema',
    };

    const typeData = Object.entries(byType).map(([key, value]) => ({
        name: typeLabels[key] || key,
        count: value,
    }));

    const chartConfig = {
        contentStyle: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#e2e8f0',
            borderRadius: '8px',
            fontSize: '12px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        },
        labelStyle: { fontWeight: 'bold', color: '#1e293b' },
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Distribuição por Status */}
            <div className="glow-card p-4 sm:p-5 rounded-3xl">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">
                    Distribuição por Status
                </h3>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statusData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 9, fill: '#94a3b8' }}
                                angle={-15}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                            />
                            <Tooltip
                                contentStyle={chartConfig.contentStyle}
                                labelStyle={chartConfig.labelStyle}
                                cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                            />
                            <Bar dataKey="count" name="Quantidade" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Distribuição por Tipo */}
            <div className="glow-card p-4 sm:p-5 rounded-3xl">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">
                    Distribuição por Tipo
                </h3>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={typeData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 9, fill: '#94a3b8' }}
                                angle={-15}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                            />
                            <Tooltip
                                contentStyle={chartConfig.contentStyle}
                                labelStyle={chartConfig.labelStyle}
                                cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                            />
                            <Bar dataKey="count" name="Quantidade" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
