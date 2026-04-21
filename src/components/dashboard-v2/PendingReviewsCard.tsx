import React from 'react';
import { AlertCircle, Clock, CalendarClock, ListChecks } from 'lucide-react';

interface PendingReviewsCardProps {
    reviews: {
        overdue: number;
        today: number;
        future: number;
    };
}

export const PendingReviewsCard: React.FC<PendingReviewsCardProps> = ({ reviews }) => {
    const totalUrgent = reviews.overdue + reviews.today;

    return (
        <div className="glow-card p-5 rounded-3xl flex flex-col h-full">
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Fluxo de Estudo</span>
                    <ListChecks className="w-4 h-4 text-orange-500" />
                </div>

                {/* Main Number */}
                <div className="flex flex-col mb-5">
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-extrabold text-[#1a2332] dark:text-white tracking-tight">
                            {totalUrgent}
                        </h3>
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Para Hoje</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mt-1">
                        Carga Total: {reviews.overdue + reviews.today + reviews.future} revisões
                    </span>
                </div>

                {/* Breakdown Cubes - 3 columns */}
                <div className="grid grid-cols-3 gap-2 mb-5 flex-1 content-start">
                    {/* Atrasadas */}
                    <div className="flex flex-col items-center justify-center py-3 px-1 bg-[#FFFAFA] dark:bg-red-500/5 rounded-2xl border border-red-100 dark:border-red-500/10">
                        <AlertCircle className="w-4 h-4 text-red-500 mb-1" />
                        <span className="text-lg font-black text-red-600 dark:text-red-500 leading-none">{reviews.overdue}</span>
                        <span className="text-[9px] text-red-400 dark:text-red-500/80 font-bold uppercase tracking-wider mt-1 truncate w-full text-center px-1">Atraso</span>
                    </div>

                    {/* Hoje */}
                    <div className="flex flex-col items-center justify-center py-3 px-1 bg-orange-50 dark:bg-orange-500/5 rounded-2xl border border-orange-100 dark:border-orange-500/10">
                        <Clock className="w-4 h-4 text-orange-500 mb-1" />
                        <span className="text-lg font-black text-orange-600 dark:text-orange-500 leading-none">{reviews.today}</span>
                        <span className="text-[9px] text-orange-400 dark:text-orange-500/80 font-bold uppercase tracking-wider mt-1 truncate w-full text-center px-1">Hoje</span>
                    </div>

                    {/* Futuras */}
                    <div className="flex flex-col items-center justify-center py-3 px-1 bg-[#F8FAFF] dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/10">
                        <CalendarClock className="w-4 h-4 text-blue-500 mb-1" />
                        <span className="text-lg font-black text-blue-600 dark:text-blue-500 leading-none">{reviews.future}</span>
                        <span className="text-[9px] text-blue-400 dark:text-blue-500/80 font-bold uppercase tracking-wider mt-1 truncate w-full text-center px-1">Futuras</span>
                    </div>
                </div>

                {/* Progress Bar - Carga Atual/Total */}
                <div className="mt-auto pt-2">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Peso da Fila</span>
                        <span className="text-[11px] font-bold text-[#1a2332] dark:text-slate-300">
                            {Math.round((totalUrgent / Math.max(1, reviews.overdue + reviews.today + reviews.future)) * 100)}% atual
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-[#ff5722] to-orange-400 transition-all duration-500"
                            style={{ width: `${Math.max(5, (totalUrgent / Math.max(1, reviews.overdue + reviews.today + reviews.future)) * 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
