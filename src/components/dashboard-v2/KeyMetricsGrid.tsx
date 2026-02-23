import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, CalendarDays, AlertCircle, Clock, CalendarClock, ListChecks } from 'lucide-react';

interface KeyMetricsGridProps {
    reviews: {
        overdue: number;
        today: number;
        future: number;
    };
    progress: {
        topics: { completed: number; total: number; percentage: number };
        subjects: { completed: number; total: number; percentage: number };
    };
    activeDays: {
        current: number;
        total: number; // usually days in month
    };
}

export const KeyMetricsGrid: React.FC<KeyMetricsGridProps> = ({
    reviews,
    progress,
    activeDays
}) => {
    const totalPending = reviews.overdue + reviews.today + reviews.future;
    const completedPercentage = totalPending > 0 ? 0 : 100; // 0% when there are pending reviews

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            {/* Card 1: Revisões Pendentes */}
            <div className="glow-card p-6 rounded-3xl flex flex-col h-full">
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Revisões Pendentes</span>
                        <ListChecks className="w-5 h-5 text-orange-500" />
                    </div>

                    {/* Main Number */}
                    <div className="flex items-baseline gap-2 mb-6">
                        <h3 className="text-5xl font-extrabold text-[#1a2332] dark:text-white tracking-tight">
                            {totalPending}
                        </h3>
                        <span className="text-sm font-bold text-slate-400 dark:text-slate-500">revisões</span>
                    </div>

                    {/* Breakdown Cubes - 3 columns */}
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        {/* Atrasadas */}
                        <div className="flex flex-col items-center justify-center p-4 bg-[#FFFAFA] dark:bg-red-500/5 rounded-2xl border border-red-100 dark:border-red-500/10">
                            <AlertCircle className="w-5 h-5 text-red-500 mb-2" />
                            <span className="text-2xl font-black text-red-600 dark:text-red-500">{reviews.overdue}</span>
                            <span className="text-[10px] text-red-400 dark:text-red-500/80 font-bold uppercase tracking-wider mt-1">Atrasadas</span>
                        </div>

                        {/* Hoje */}
                        <div className="flex flex-col items-center justify-center p-4 bg-[#FFFEF5] dark:bg-amber-500/5 rounded-2xl border border-amber-100 dark:border-amber-500/10">
                            <Clock className="w-5 h-5 text-amber-500 mb-2" />
                            <span className="text-2xl font-black text-amber-600 dark:text-amber-500">{reviews.today}</span>
                            <span className="text-[10px] text-amber-400 dark:text-amber-500/80 font-bold uppercase tracking-wider mt-1">Hoje</span>
                        </div>

                        {/* Futuras */}
                        <div className="flex flex-col items-center justify-center p-4 bg-[#F8FAFF] dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/10">
                            <CalendarClock className="w-5 h-5 text-blue-500 mb-2" />
                            <span className="text-2xl font-black text-blue-600 dark:text-blue-500">{reviews.future}</span>
                            <span className="text-[10px] text-blue-400 dark:text-blue-500/80 font-bold uppercase tracking-wider mt-1">Futuras</span>
                        </div>
                    </div>

                    {/* Progress Bar - Restantes/Total */}
                    <div className="mt-auto">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Progresso do dia</span>
                            <span className="text-xs font-bold text-[#1a2332] dark:text-slate-300">
                                {reviews.overdue + reviews.today} restantes
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-white/5 h-2.5 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500"
                                style={{ width: `${Math.max(5, (reviews.today / Math.max(1, reviews.overdue + reviews.today)) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Card 2: Progresso & Consistência */}
            <div className="glow-card p-8 rounded-3xl flex flex-col h-full">
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Progresso & Consistência</span>
                        <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                    </div>

                    <div className="space-y-6 flex-1">
                        {/* Tópicos */}
                        <div className="border-b border-slate-100 dark:border-white/5 pb-4">
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-[13px] font-bold text-slate-400 dark:text-slate-500">Tópicos</span>
                                <span className="text-[15px] font-bold text-[#1a2332] dark:text-slate-200">
                                    {progress.topics.completed}/{progress.topics.total}
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-white/5 h-2.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-slate-200 dark:bg-slate-600 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${progress.topics.percentage}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Matérias */}
                        <div className="border-b border-slate-100 dark:border-white/5 pb-4">
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-[13px] font-bold text-slate-400 dark:text-slate-500">Matérias</span>
                                <span className="text-[15px] font-bold text-[#1a2332] dark:text-slate-200">
                                    {progress.subjects.completed}/{progress.subjects.total}
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-white/5 h-2.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-slate-200 dark:bg-slate-600 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${progress.subjects.percentage}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Dias de Estudo */}
                        <div className="flex items-center justify-between pt-2">
                            <CalendarDays className="w-5 h-5 text-emerald-500" />
                            <span className="text-[13px] font-bold text-slate-400 dark:text-slate-500">Dias Ativos</span>
                            <div className="flex items-center gap-3">
                                <span className="text-[15px] font-black text-[#1a2332] dark:text-slate-200">
                                    {activeDays.current}/{activeDays.total}
                                </span>
                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                                    {Math.round((activeDays.current / activeDays.total) * 100)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
