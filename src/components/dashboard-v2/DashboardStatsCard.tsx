import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from '@/hooks/useDashboardStats';
import {
    Target, CheckCircle2, CalendarDays,
    AlertCircle, Sparkles, BarChart3, TrendingUp
} from 'lucide-react';
import { cn } from "@/lib/utils";

interface DashboardStatsCardProps {
    stats: DashboardStats;
    selectedMonth?: Date;
    className?: string;
}

export const DashboardStatsCard: React.FC<DashboardStatsCardProps> = ({ stats, selectedMonth, className }) => {
    const [viewMode, setViewMode] = useState<'month' | 'general'>('month');

    const monthStats = stats.month;
    const allTimeStats = stats.general;

    return (
        <Card className={cn("flex flex-col h-full border-0 shadow-sm", className)}>
            <CardHeader className="pb-2 space-y-0 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                    <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Estatísticas
                </CardTitle>

                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                    <button
                        onClick={() => setViewMode('month')}
                        className={cn(
                            "px-2 py-1 text-[10px] font-semibold rounded-md transition-all duration-200",
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
                            "px-2 py-1 text-[10px] font-semibold rounded-md transition-all duration-200",
                            viewMode === 'general'
                                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        )}
                    >
                        Geral
                    </button>
                </div>
            </CardHeader>

            <CardContent className="pt-0 p-3">
                <div className="space-y-1.5">
                    {viewMode === 'month' ? (
                        <>
                            {/* Aba Mês - Compacto */}
                            {/* 1. Tópicos Iniciados */}
                            <div className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-md transition-colors">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm">📚</span>
                                    <span className="text-[10px] font-medium text-slate-600">Tópicos Iniciados</span>
                                </div>
                                <span className="text-xs font-bold text-blue-600">{monthStats.firstContacts}</span>
                            </div>

                            {/* 2. Revisões Feitas */}
                            <div className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-md transition-colors">
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    <span className="text-[10px] font-medium text-slate-600">Revisões Feitas</span>
                                </div>
                                <span className="text-xs font-bold text-green-600">{monthStats.reviewsCompleted}</span>
                            </div>

                            {/* 3. Revisões para Hoje */}
                            <div className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-md transition-colors">
                                <div className="flex items-center gap-1.5">
                                    <CalendarDays className="h-3 w-3 text-yellow-500" />
                                    <span className="text-[10px] font-medium text-slate-600">Para Hoje</span>
                                </div>
                                <span className="text-xs font-bold text-yellow-600">{monthStats.todayReviewCount}</span>
                            </div>

                            {/* 4. Revisões Atrasadas */}
                            <div className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-md transition-colors">
                                <div className="flex items-center gap-1.5">
                                    <AlertCircle className="h-3 w-3 text-red-500" />
                                    <span className="text-[10px] font-medium text-slate-600">Atrasadas</span>
                                </div>
                                <span className="text-xs font-bold text-red-600">{monthStats.overdueCount}</span>
                            </div>

                            {/* 5. Revisões Futuras */}
                            <div className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-md transition-colors">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm">🔮</span>
                                    <span className="text-[10px] font-medium text-slate-600">Revisões Futuras</span>
                                </div>
                                <span className="text-xs font-bold text-purple-600">{monthStats.futureReviewCount}</span>
                            </div>

                            {/* 6. Total de Revisões */}
                            <div className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-md transition-colors">
                                <div className="flex items-center gap-1.5">
                                    <BarChart3 className="h-3 w-3 text-blue-500" />
                                    <span className="text-[10px] font-medium text-slate-600">Total de Revisões</span>
                                </div>
                                <span className="text-xs font-bold text-blue-600">{monthStats.totalReviews}</span>
                            </div>

                            {/* 7. Dias Ativos */}
                            <div className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-md transition-colors">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm">✅</span>
                                    <span className="text-[10px] font-medium text-slate-600">Dias Ativos</span>
                                </div>
                                <span className="text-xs font-bold text-teal-600">{monthStats.activeDays}/{monthStats.totalDaysInMonth}</span>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Aba Geral - Compacto */}
                            {/* 1. Tópicos Iniciados */}
                            <div className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-md transition-colors">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm">📚</span>
                                    <span className="text-[10px] font-medium text-slate-600">Total Tópicos</span>
                                </div>
                                <span className="text-xs font-bold text-blue-600">{allTimeStats.firstContacts}</span>
                            </div>

                            {/* 2. Revisões Realizadas */}
                            <div className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-md transition-colors">
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    <span className="text-[10px] font-medium text-slate-600">Total Revisões</span>
                                </div>
                                <span className="text-xs font-bold text-green-600">{allTimeStats.reviewsCompleted}</span>
                            </div>

                            {/* 3. Média diária */}
                            <div className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-md transition-colors">
                                <div className="flex items-center gap-1.5">
                                    <TrendingUp className="h-3 w-3 text-purple-500" />
                                    <span className="text-[10px] font-medium text-slate-600">Média Diária</span>
                                </div>
                                <span className="text-xs font-bold text-purple-600">
                                    {allTimeStats.totalActiveDays === 0
                                        ? '0'
                                        : Math.round((allTimeStats.firstContacts + allTimeStats.reviewsCompleted) / allTimeStats.totalActiveDays)
                                    }
                                </span>
                            </div>

                            {/* 4. Revisões Atrasadas */}
                            <div className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-md transition-colors">
                                <div className="flex items-center gap-1.5">
                                    <AlertCircle className="h-3 w-3 text-red-500" />
                                    <span className="text-[10px] font-medium text-slate-600">Revisões Atrasadas</span>
                                </div>
                                <span className="text-xs font-bold text-red-600">{allTimeStats.overdueCount}</span>
                            </div>

                            {/* 5. Revisões Futuras */}
                            <div className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-md transition-colors">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm">🔮</span>
                                    <span className="text-[10px] font-medium text-slate-600">Revisões Futuras</span>
                                </div>
                                <span className="text-xs font-bold text-purple-600">{allTimeStats.futureReviewCount}</span>
                            </div>

                            {/* 6. Total de Revisões */}
                            <div className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-md transition-colors">
                                <div className="flex items-center gap-1.5">
                                    <BarChart3 className="h-3 w-3 text-blue-500" />
                                    <span className="text-[10px] font-medium text-slate-600">Total de Revisões</span>
                                </div>
                                <span className="text-xs font-bold text-blue-600">{allTimeStats.totalReviews}</span>
                            </div>

                            {/* 7. Dias Ativos */}
                            <div className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-md transition-colors">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm">✅</span>
                                    <span className="text-[10px] font-medium text-slate-600">Dias Ativos</span>
                                </div>
                                <span className="text-xs font-bold text-teal-600">{allTimeStats.totalActiveDays}</span>
                            </div>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
