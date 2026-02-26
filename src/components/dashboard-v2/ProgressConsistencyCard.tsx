import React from 'react';
import { CheckCircle2, CalendarDays } from 'lucide-react';

interface ProgressConsistencyCardProps {
    progress: {
        topics: { completed: number; total: number; percentage: number };
        subjects: { completed: number; total: number; percentage: number };
    };
    activeDays: {
        current: number;
        total: number;
    };
}

export const ProgressConsistencyCard: React.FC<ProgressConsistencyCardProps> = ({
    progress,
    activeDays
}) => {
    return (
        <div className="glow-card p-5 rounded-3xl flex flex-col h-full">
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Progresso</span>
                    <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                </div>

                <div className="space-y-4 flex-1 flex flex-col justify-center">
                    {/* Tópicos */}
                    <div className="border-b border-slate-100 dark:border-white/5 pb-3">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Tópicos</span>
                            <span className="text-sm font-bold text-[#1a2332] dark:text-slate-200">
                                {progress.topics.completed}/{progress.topics.total}
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                            <div
                                className="bg-slate-300 dark:bg-slate-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${progress.topics.percentage}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Matérias */}
                    <div className="border-b border-slate-100 dark:border-white/5 pb-3">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Matérias</span>
                            <span className="text-sm font-bold text-[#1a2332] dark:text-slate-200">
                                {progress.subjects.completed}/{progress.subjects.total}
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                            <div
                                className="bg-slate-300 dark:bg-slate-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${progress.subjects.percentage}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Dias de Estudo */}
                    <div className="flex items-center justify-between pt-2">
                        <CalendarDays className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 flex-1 ml-2">Dias Ativos</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-[#1a2332] dark:text-slate-200">
                                {activeDays.current}/{activeDays.total}
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                                {Math.round((activeDays.current / activeDays.total) * 100)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
