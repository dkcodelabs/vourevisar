import React from 'react';
import {
    BookOpen,
    AlertCircle,
    Clock,
    CalendarClock,
    User,
    CheckCircle2,
    Target,
    Shield
} from 'lucide-react';
import { ProtectionMode } from '@/utils/calculateProtectionMode';

interface ReviewsStatsCardProps {
    totalTopics: number;
    totalScheduledReviews: number;
    startedTopicsCount: number;
    completedTopicsCount: number;
    completedReviews: number;
    pendingReviews: number;
    notStartedReviews: number;
    overdue: number;
    today: number;
    future: number;
    protectionMode: ProtectionMode;
    maxReviews: number;
    className?: string;
}

const PROTECTION_COLORS: Record<ProtectionMode, { bg: string; text: string; border: string }> = {
    'Alta': {
        bg: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-600 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800'
    },
    'Média': {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800'
    },
    'Baixa': {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800'
    }
};

export const ReviewsStatsCard: React.FC<ReviewsStatsCardProps> = ({
    totalTopics,
    totalScheduledReviews,
    startedTopicsCount,
    completedTopicsCount,
    completedReviews,
    pendingReviews,
    notStartedReviews,
    overdue,
    today,
    future,
    protectionMode,
    maxReviews,
    className
}) => {
    const modeColors = PROTECTION_COLORS[protectionMode] || PROTECTION_COLORS['Média'];

    // Percentuais para barra de 3 cores
    const completedPercentage = totalScheduledReviews > 0
        ? Math.min(100, (completedReviews / totalScheduledReviews) * 100)
        : 0;
    const pendingPercentage = totalScheduledReviews > 0
        ? Math.min(100, (pendingReviews / totalScheduledReviews) * 100)
        : 0;
    const notStartedPercentage = totalScheduledReviews > 0
        ? Math.min(100, (notStartedReviews / totalScheduledReviews) * 100)
        : 0;

    return (
        <div className={`glow-card group relative overflow-hidden bg-card dark:bg-zinc-900/40 border border-border dark:border-white/5 hover:border-border-strong dark:hover:border-white/10 transition-all duration-300 rounded-3xl flex flex-col h-full shadow-sm ${className}`}>
            <div className="p-5 h-full flex flex-col">

                {/* Header: Modo de Proteção */}
                <div className="flex items-center justify-between mb-4 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${modeColors.bg} shrink-0`}>
                            <Shield className={`w-4 h-4 ${modeColors.text}`} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Modo de Proteção</p>
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${modeColors.text}`}>
                                {protectionMode}
                            </p>
                        </div>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${modeColors.bg} ${modeColors.text} border ${modeColors.border}`}>
                        {maxReviews} revisões/tópico
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-4">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Target className="w-4 h-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Progresso de Revisões</span>
                        </div>

                        {/* Barra de 3 cores empilhadas */}
                        <div className="relative w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                            {/* Cinza (Não iniciadas) - toda a barra como fundo */}
                            {/* Azul (Pendentes) - parcial */}
                            <div
                                className="absolute inset-y-0 left-0 bg-blue-400 dark:bg-blue-500 transition-all duration-500"
                                style={{ width: `${completedPercentage + pendingPercentage}%` }}
                            />
                            {/* Verde (Feitas) - por cima */}
                            <div
                                className="absolute inset-y-0 left-0 bg-emerald-500 dark:bg-emerald-500 transition-all duration-500"
                                style={{ width: `${completedPercentage}%` }}
                            />
                        </div>

                        {/* Legenda */}
                        <div className="flex flex-wrap items-center justify-between mt-3 text-[10px] md:text-[11px] gap-y-2">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-emerald-700 dark:text-emerald-400 font-medium whitespace-nowrap">Feitas: {completedReviews}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                                    <span className="text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">Pendentes: {pendingReviews}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                                    <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">Não inic.: {notStartedReviews}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Topics Summary (Redesigned) */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-white dark:bg-slate-700 rounded-lg border border-slate-100 dark:border-slate-600 shadow-sm">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            </div>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Tópicos Estudados</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                {completedTopicsCount} <span className="text-slate-400 text-xs font-normal">/ {totalTopics}</span>
                            </span>
                            {totalTopics > 0 && (
                                <div className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold rounded-md border border-indigo-200 dark:border-indigo-800">
                                    {Math.round((completedTopicsCount / totalTopics) * 100)}%
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="space-y-4 mt-4">

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Atrasadas */}
                        <div className="flex flex-col items-center justify-center py-2.5 px-1 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20 shadow-sm gap-1.5 min-w-0">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                            <span className="text-xl font-bold text-red-600 dark:text-red-400 leading-none truncate w-full text-center">{overdue}</span>
                            <span className="text-[9px] text-red-500/90 font-bold uppercase tracking-wide truncate w-full text-center">Atrasadas</span>
                        </div>

                        {/* Hoje */}
                        <div className="flex flex-col items-center justify-center py-2.5 px-1 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20 shadow-sm gap-1.5 min-w-0">
                            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 leading-none truncate w-full text-center">{today}</span>
                            <span className="text-[9px] text-amber-500/90 font-bold uppercase tracking-wide truncate w-full text-center">Hoje</span>
                        </div>

                        {/* Futuras */}
                        <div className="flex flex-col items-center justify-center py-2.5 px-1 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20 shadow-sm gap-1.5 min-w-0">
                            <CalendarClock className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="text-xl font-bold text-blue-600 dark:text-blue-400 leading-none truncate w-full text-center">{future}</span>
                            <span className="text-[9px] text-blue-500/90 font-bold uppercase tracking-wide truncate w-full text-center">Futuras</span>
                        </div>

                        {/* Feitas */}
                        <div className="flex flex-col items-center justify-center py-2.5 px-1 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/20 shadow-sm gap-1.5 min-w-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 leading-none truncate w-full text-center">{completedReviews}</span>
                            <span className="text-[9px] text-emerald-500/90 font-bold uppercase tracking-wide truncate w-full text-center">Feitas</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
                        <div className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span><strong className="text-slate-700 dark:text-slate-200 font-bold">{pendingReviews}</strong> revisões pendentes</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewsStatsCard;
