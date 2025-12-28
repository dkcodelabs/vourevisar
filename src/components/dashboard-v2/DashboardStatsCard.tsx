import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatsList, StatItem } from './StatsList';
import { StatsProfileFooter } from './StatsProfileFooter';
import { DashboardStats } from '@/hooks/useDashboardStats';
import { useUserSettings } from '@/hooks/useUserSettings';
import {
    Target, BookOpen, CheckCircle2, CalendarDays,
    AlertCircle, Sparkles, BarChart3, TrendingUp
} from 'lucide-react';
import { cn } from "@/lib/utils";

interface DashboardStatsCardProps {
    stats: DashboardStats;
    className?: string;
}

export const DashboardStatsCard: React.FC<DashboardStatsCardProps> = ({ stats, className }) => {
    const [viewMode, setViewMode] = useState<'month' | 'general'>('month');
    const { settings, getProfileInfo, getCycleStats } = useUserSettings();

    const profileInfo = getProfileInfo();
    const cycleStats = getCycleStats();

    const monthStats = stats.month;
    const allTimeStats = stats.general;

    // Mapear dados do mês para lista (These are no longer used with the new compact design)
    const monthItems: StatItem[] = [
        {
            icon: BookOpen,
            label: "Tópicos Iniciados",
            value: stats.month.firstContacts,
            variant: "info"
        },
        {
            icon: CheckCircle2,
            label: "Revisões Realizadas",
            value: stats.month.reviewsCompleted,
            variant: "success"
        },
        {
            icon: CalendarDays,
            label: "Revisões para Hoje",
            value: stats.month.todayReviewCount,
            variant: stats.month.todayReviewCount > 0 ? "warning" : "default"
        },
        {
            icon: AlertCircle,
            label: "Revisões Atrasadas",
            value: stats.month.overdueCount,
            variant: stats.month.overdueCount > 0 ? "danger" : "default"
        },
        {
            icon: Sparkles,
            label: "Revisões Futuras",
            value: stats.month.futureReviewCount,
            variant: "purple"
        },
        {
            icon: BarChart3,
            label: "Total de Revisões",
            value: stats.month.totalReviews,
            variant: "info"
        },
        {
            icon: CheckCircle2,
            label: "Dias Ativos",
            value: `${stats.month.activeDays}/${stats.month.totalDaysInMonth}`,
            variant: "success"
        }
    ];

    // Mapear dados gerais para lista (These are no longer used with the new compact design)
    const generalItems: StatItem[] = [
        {
            icon: BookOpen,
            label: "Tópicos Iniciados",
            value: stats.general.firstContacts,
            variant: "info"
        },
        {
            icon: CheckCircle2,
            label: "Revisões Realizadas",
            value: stats.general.reviewsCompleted,
            variant: "success"
        },
        {
            icon: TrendingUp,
            label: "Média diária",
            value: stats.general.averagePerDay,
            variant: "default"
        },
        {
            icon: AlertCircle,
            label: "Revisões Atrasadas",
            value: stats.general.overdueCount,
            variant: stats.general.overdueCount > 0 ? "danger" : "default"
        },
        {
            icon: Sparkles,
            label: "Revisões Futuras",
            value: stats.general.futureReviewCount,
            variant: "purple"
        },
        {
            icon: BarChart3,
            label: "Total de Revisões",
            value: stats.general.totalReviews,
            variant: "info"
        },
        {
            icon: CheckCircle2,
            label: "Dias Ativos",
            value: stats.general.totalActiveDays,
            variant: "success"
        }
    ];

    return (
        <Card className={cn("flex flex-col h-full border-0 shadow-sm", className)}>
            <CardHeader className="pb-4 space-y-0 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
                    <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    Estatísticas
                </CardTitle>

                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('month')}
                        className={cn(
                            "px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200",
                            viewMode === 'month'
                                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        )}
                    >
                        Mês
                    </button>
                    <button
                        onClick={() => setViewMode('general')}
                        className={cn(
                            "px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200",
                            viewMode === 'general'
                                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        )}
                    >
                        Geral
                    </button>
                </div>
            </CardHeader>

            <CardContent className="pt-0 p-4">
                <div className="space-y-4">
                    {viewMode === 'month' ? (
                        <>
                            {/* Aba Mês */}
                            {/* 1. Tópicos Iniciados */}
                            <div className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <span className="text-lg">📚</span>
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">Tópicos Iniciados</span>
                                </div>
                                <span className="text-lg font-bold text-slate-900">{monthStats.firstContacts}</span>
                            </div>

                            {/* 2. Revisões Realizadas */}
                            <div className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">Revisões Feitas</span>
                                </div>
                                <span className="text-lg font-bold text-slate-900">{monthStats.reviewsCompleted}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* 3. Revisões para Hoje */}
                                <div className="flex flex-col p-3 bg-yellow-50/50 rounded-xl border border-yellow-100">
                                    <span className="text-xs text-yellow-700 font-medium mb-1">Para Hoje</span>
                                    <span className="text-xl font-bold text-yellow-700">{monthStats.todayReviewCount}</span>
                                </div>
                                {/* 4. Revisões Atrasadas */}
                                <div className="flex flex-col p-3 bg-red-50/50 rounded-xl border border-red-100">
                                    <span className="text-xs text-red-700 font-medium mb-1">Atrasadas</span>
                                    <span className="text-xl font-bold text-red-700">{monthStats.overdueCount}</span>
                                </div>
                            </div>

                            {/* 5. Revisões Futuras */}
                            <div className="flex items-center justify-between p-2 px-3 hover:bg-slate-50 rounded-lg transition-colors">
                                <div className="flex items-center gap-2">
                                    <span className="text-base">🔮</span>
                                    <span className="text-xs font-medium text-slate-600">Revisões Futuras</span>
                                </div>
                                <span className="text-sm font-bold text-purple-600">{monthStats.futureReviewCount}</span>
                            </div>

                            {/* 6. Total de Revisões */}
                            <div className="flex items-center justify-between p-2 px-3 hover:bg-slate-50 rounded-lg transition-colors">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-blue-500" />
                                    <span className="text-xs font-medium text-slate-600">Total de Revisões</span>
                                </div>
                                <span className="text-sm font-bold text-blue-600">{monthStats.totalReviews}</span>
                            </div>

                            {/* 7. Dias Ativos */}
                            <div className="flex items-center justify-between p-2 px-3 hover:bg-slate-50 rounded-lg transition-colors">
                                <div className="flex items-center gap-2">
                                    <span className="text-base">✅</span>
                                    <span className="text-xs font-medium text-slate-600">Dias Ativos</span>
                                </div>
                                <span className="text-sm font-bold text-teal-600">{monthStats.activeDays}/{monthStats.totalDaysInMonth}</span>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Aba Geral */}
                            {/* 1. Tópicos Iniciados */}
                            <div className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <span className="text-lg">📚</span>
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">Total Tópicos</span>
                                </div>
                                <span className="text-lg font-bold text-slate-900">{allTimeStats.firstContacts}</span>
                            </div>

                            {/* 2. Revisões Realizadas */}
                            <div className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">Total Revisões</span>
                                </div>
                                <span className="text-lg font-bold text-slate-900">{allTimeStats.reviewsCompleted}</span>
                            </div>

                            {/* 3. Média diária */}
                            <div className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                        <span className="text-lg">📈</span>
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">Média Diária</span>
                                </div>
                                <span className="text-lg font-bold text-slate-900">
                                    {allTimeStats.totalActiveDays === 0
                                        ? '0'
                                        : Math.round((allTimeStats.firstContacts + allTimeStats.reviewsCompleted) / allTimeStats.totalActiveDays)
                                    }
                                </span>
                            </div>

                            {/* 4. Revisões Atrasadas */}
                            <div className="flex items-center justify-between p-2 px-3 hover:bg-slate-50 rounded-lg transition-colors mt-2">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                    <span className="text-xs font-medium text-slate-600">Revisões Atrasadas</span>
                                </div>
                                <span className="text-sm font-bold text-red-600">{allTimeStats.overdueCount}</span>
                            </div>

                            {/* 5. Revisões Futuras */}
                            <div className="flex items-center justify-between p-2 px-3 hover:bg-slate-50 rounded-lg transition-colors">
                                <div className="flex items-center gap-2">
                                    <span className="text-base">🔮</span>
                                    <span className="text-xs font-medium text-slate-600">Revisões Futuras</span>
                                </div>
                                <span className="text-sm font-bold text-purple-600">{allTimeStats.futureReviewCount}</span>
                            </div>

                            {/* 6. Total de Revisões */}
                            <div className="flex items-center justify-between p-2 px-3 hover:bg-slate-50 rounded-lg transition-colors">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-blue-500" />
                                    <span className="text-xs font-medium text-slate-600">Total de Revisões</span>
                                </div>
                                <span className="text-sm font-bold text-blue-600">{allTimeStats.totalReviews}</span>
                            </div>

                            {/* 7. Dias Ativos */}
                            <div className="flex items-center justify-between p-2 px-3 hover:bg-slate-50 rounded-lg transition-colors">
                                <div className="flex items-center gap-2">
                                    <span className="text-base">✅</span>
                                    <span className="text-xs font-medium text-slate-600">Dias Ativos</span>
                                </div>
                                <span className="text-sm font-bold text-teal-600">{allTimeStats.totalActiveDays}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer com informações do perfil */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <StatsProfileFooter
                        profileName={profileInfo?.profileName || 'Carregando...'}
                        subjectsPerDay={settings?.subjects_per_day || 3}
                        completedCycles={cycleStats?.completedCycles || 0}
                        intervals={profileInfo?.intervals || [1, 7, 15, 30]}
                    />
                </div>
            </CardContent>
        </Card>
    );
};
