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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Card 1: Revisões Pendentes - Redesigned */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <CardContent className="p-5 relative z-10 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revisões Pendentes</p>
                        <div className="p-2 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl">
                            <ListChecks className="w-5 h-5 text-orange-600" />
                        </div>
                    </div>

                    {/* Main Number */}
                    <div className="flex items-baseline gap-2 mb-4">
                        <h3 className="text-4xl font-bold text-slate-900 dark:text-white">
                            {totalPending}
                        </h3>
                        <span className="text-sm text-slate-400 font-medium">revisões</span>
                    </div>

                    {/* Breakdown with Icons - 3 columns */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {/* Atrasadas */}
                        <div className="flex flex-col items-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-red-500 mb-1" />
                            <span className="text-lg font-bold text-red-600 dark:text-red-400">{reviews.overdue}</span>
                            <span className="text-[10px] text-red-500/80 font-medium uppercase tracking-wide">Atrasadas</span>
                        </div>

                        {/* Hoje */}
                        <div className="flex flex-col items-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                            <Clock className="w-4 h-4 text-amber-500 mb-1" />
                            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{reviews.today}</span>
                            <span className="text-[10px] text-amber-500/80 font-medium uppercase tracking-wide">Hoje</span>
                        </div>

                        {/* Futuras */}
                        <div className="flex flex-col items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <CalendarClock className="w-4 h-4 text-blue-500 mb-1" />
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{reviews.future}</span>
                            <span className="text-[10px] text-blue-500/80 font-medium uppercase tracking-wide">Futuras</span>
                        </div>
                    </div>

                    {/* Progress Bar - Restantes/Total */}
                    <div className="mt-auto">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Progresso do dia</span>
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                {reviews.overdue + reviews.today} restantes
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-500"
                                style={{ width: `${Math.max(5, (reviews.today / Math.max(1, reviews.overdue + reviews.today)) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Card 2: Progresso (Tópicos e Matérias) */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Progresso Geral</p>
                        <div className="p-2 bg-indigo-500/10 rounded-xl">
                            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Tópicos */}
                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-xs text-slate-500">Tópicos</span>
                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                    {progress.topics.completed}/{progress.topics.total}
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-indigo-500 h-full rounded-full"
                                    style={{ width: `${progress.topics.percentage}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Matérias */}
                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-xs text-slate-500">Matérias</span>
                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                    {progress.subjects.completed}/{progress.subjects.total}
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-purple-500 h-full rounded-full"
                                    style={{ width: `${progress.subjects.percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Card 3: Dias de Estudo */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                <CardContent className="p-6 flex items-start justify-between relative z-10">
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Dias de Estudo</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                                {activeDays.current} <span className="text-lg text-slate-400 font-normal">/ {activeDays.total}</span>
                            </h3>
                        </div>
                        <p className="text-xs text-emerald-600 mt-2 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full inline-block">
                            {Math.round((activeDays.current / activeDays.total) * 100)}% do mês
                        </p>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-xl">
                        <CalendarDays className="w-6 h-6 text-emerald-600" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
