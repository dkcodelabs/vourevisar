import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
    BookOpen,
    AlertCircle,
    Clock,
    CalendarClock,
    User,
    CheckCircle2,
    Target
} from 'lucide-react';
import { ReviewProfile } from '@/types/study';

interface ReviewsStatsCardProps {
    totalTopics: number;
    totalScheduledReviews: number;
    startedTopicsCount: number;
    startedReviews: number;
    completedReviews: number;
    overdue: number;
    today: number;
    future: number;
    reviewProfile: ReviewProfile;
    maxReviews: number;
    className?: string;
}

const PROFILE_LABELS: Record<ReviewProfile, string> = {
    [ReviewProfile.BEGINNER]: 'Iniciante',
    [ReviewProfile.INTERMEDIATE]: 'Intermediário',
    [ReviewProfile.ADVANCED]: 'Avançado'
};

const PROFILE_COLORS: Record<ReviewProfile, { bg: string; text: string; border: string }> = {
    [ReviewProfile.BEGINNER]: {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800'
    },
    [ReviewProfile.INTERMEDIATE]: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800'
    },
    [ReviewProfile.ADVANCED]: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        text: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-800'
    }
};

export const ReviewsStatsCard: React.FC<ReviewsStatsCardProps> = ({
    totalTopics,
    totalScheduledReviews,
    startedTopicsCount,
    startedReviews,
    completedReviews,
    overdue,
    today,
    future,
    reviewProfile,
    maxReviews,
    className
}) => {
    const profileColors = PROFILE_COLORS[reviewProfile];

    // Percentages for stacked bar
    const startedPercentage = totalScheduledReviews > 0
        ? Math.min(100, (startedReviews / totalScheduledReviews) * 100)
        : 0;
    const completedPercentage = totalScheduledReviews > 0
        ? Math.min(100, (completedReviews / totalScheduledReviews) * 100)
        : 0;

    const pendingTotal = overdue + today + future;

    return (
        <Card className={`border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900 overflow-hidden flex flex-col ${className}`}>
            <CardContent className="p-6 h-full flex flex-col justify-between gap-6">

                {/* Top Section */}
                <div className="space-y-6">
                    {/* Header: Perfil do Usuário */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${profileColors.bg}`}>
                                <User className={`w-5 h-5 ${profileColors.text}`} />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">Perfil</p>
                                <p className={`text-base font-bold ${profileColors.text}`}>
                                    {PROFILE_LABELS[reviewProfile]}
                                </p>
                            </div>
                        </div>
                        <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${profileColors.bg} ${profileColors.text} border ${profileColors.border}`}>
                            {maxReviews} revisões/tópico
                        </div>
                    </div>

                    {/* Stacked Progress Bar */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Target className="w-4 h-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Progresso de Revisões</span>
                        </div>

                        {/* Stacked Bar Container */}
                        <div className="relative w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                            {/* Blue bar: Iniciadas */}
                            <div
                                className="absolute inset-y-0 left-0 bg-blue-500 dark:bg-blue-600 transition-all duration-500"
                                style={{ width: `${startedPercentage}%` }}
                            />
                            {/* Green bar: Concluídas */}
                            <div
                                className="absolute inset-y-0 left-0 bg-emerald-500 dark:bg-emerald-500 transition-all duration-500"
                                style={{ width: `${completedPercentage}%` }}
                            />
                        </div>

                        {/* Legend */}
                        <div className="flex items-center justify-between mt-3 text-[11px]">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 ring-1 ring-slate-300 dark:ring-slate-600" />
                                    <span className="text-slate-500">Total: {totalScheduledReviews}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <span className="text-blue-700 dark:text-blue-400 font-medium">Iniciadas: {startedReviews}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">Feitas: {completedReviews}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Topics Summary (Redesigned) */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-white dark:bg-slate-700 rounded-lg border border-slate-100 dark:border-slate-600 shadow-sm">
                                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                            </div>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Cobertura do Edital</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                {startedTopicsCount} <span className="text-slate-400 text-xs font-normal">/ {totalTopics}</span>
                            </span>
                            {totalTopics > 0 && (
                                <div className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold rounded-md border border-indigo-200 dark:border-indigo-800">
                                    {Math.round((startedTopicsCount / totalTopics) * 100)}%
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="space-y-4">

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-3">
                        {/* Atrasadas */}
                        <div className="flex flex-col items-center justify-center py-3.5 px-1 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20 shadow-sm gap-1.5">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-xl font-bold text-red-600 dark:text-red-400 leading-none">{overdue}</span>
                            <span className="text-[9px] text-red-500/90 font-bold uppercase tracking-wide">Atrasadas</span>
                        </div>

                        {/* Hoje */}
                        <div className="flex flex-col items-center justify-center py-3.5 px-1 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20 shadow-sm gap-1.5">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 leading-none">{today}</span>
                            <span className="text-[9px] text-amber-500/90 font-bold uppercase tracking-wide">Hoje</span>
                        </div>

                        {/* Futuras */}
                        <div className="flex flex-col items-center justify-center py-3.5 px-1 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20 shadow-sm gap-1.5">
                            <CalendarClock className="w-4 h-4 text-blue-500" />
                            <span className="text-xl font-bold text-blue-600 dark:text-blue-400 leading-none">{future}</span>
                            <span className="text-[9px] text-blue-500/90 font-bold uppercase tracking-wide">Futuras</span>
                        </div>

                        {/* Feitas */}
                        <div className="flex flex-col items-center justify-center py-3.5 px-1 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/20 shadow-sm gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 leading-none">{completedReviews}</span>
                            <span className="text-[9px] text-emerald-500/90 font-bold uppercase tracking-wide">Feitas</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
                        <div className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span><strong className="text-slate-700 dark:text-slate-200 font-bold">{pendingTotal}</strong> revisões pendentes</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ReviewsStatsCard;
