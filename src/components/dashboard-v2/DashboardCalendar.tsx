import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfDay, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Subject } from '@/types';
import { cn } from "@/lib/utils";

interface DashboardCalendarProps {
    subjects: Subject[];
    reviewData?: Array<{ reviewed_at: string | null }>;
    onDayClick?: (date: Date) => void;
    onMonthChange?: (date: Date) => void;
    className?: string;
}

export const DashboardCalendar: React.FC<DashboardCalendarProps> = ({
    subjects,
    reviewData = [],
    onDayClick,
    onMonthChange,
    className
}) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Gerar dias do calendário
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const today = startOfDay(new Date());

    // Função para determinar o status de um dia
    const getDayInfo = (day: Date) => {
        const dayStart = startOfDay(day);
        let hasActivity = false;
        let overdueCount = 0;
        let todayCount = 0;
        let futureCount = 0;

        // Verificar se teve atividade (histórico)
        reviewData.forEach(review => {
            if (!review.reviewed_at) return;
            const reviewDate = startOfDay(new Date(review.reviewed_at));
            if (isSameDay(reviewDate, dayStart)) {
                hasActivity = true;
            }
        });

        // Verificar revisões agendadas
        subjects.forEach(subject => {
            subject.topics.forEach(topic => {
                if (!topic.nextReview) return;
                const reviewDate = startOfDay(new Date(topic.nextReview));

                if (isSameDay(reviewDate, dayStart)) {
                    if (dayStart < today) {
                        overdueCount++;
                    } else if (isSameDay(dayStart, today)) {
                        todayCount++;
                    } else {
                        futureCount++;
                    }
                }
            });
        });

        return {
            hasActivity,
            overdueCount,
            todayCount,
            futureCount,
            hasFutureReviews: overdueCount + todayCount + futureCount > 0
        };
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        const newMonth = direction === 'prev' ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1);
        setCurrentMonth(newMonth);
        onMonthChange?.(newMonth);
    };

    return (
        <div className={cn("flex flex-col h-full glow-card p-5 rounded-3xl relative overflow-hidden group", className)}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-[12px] font-bold text-content-main">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    Calendário de Estudos
                </div>

                <div className="flex items-center gap-1 rounded-lg">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateMonth('prev')}
                        className="h-7 w-7 p-0 hover:bg-black/5 dark:hover:bg-white/5 rounded-md text-content-main transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-[11px] font-bold text-content-main min-w-[90px] text-center uppercase tracking-widest px-2">
                        {format(currentMonth, 'MMMM', { locale: ptBR })}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateMonth('next')}
                        className="h-7 w-7 p-0 hover:bg-black/5 dark:hover:bg-white/5 rounded-md text-content-main transition-colors"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
                {/* Dias da semana */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
                        <div key={index} className="text-center text-[10px] font-semibold text-gray-500 py-1">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Dias do mês */}
                <div className="grid grid-cols-7 gap-1">
                    {days.map((day) => {
                        const dayInfo = getDayInfo(day);
                        const isToday = isSameDay(day, today);
                        // Só marcar como "estudou" se teve atividade E não é futuro (removido isFuture, confiar no hasActivity)
                        const showAsStudied = dayInfo.hasActivity;

                        return (
                            <button
                                key={day.toISOString()}
                                onClick={() => onDayClick && onDayClick(day)}
                                className={cn(
                                    "aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-medium transition-all duration-200 relative",
                                    isToday
                                        ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20"
                                        : showAsStudied
                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-500/20"
                                            : "text-content-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-content-main"
                                )}
                            >
                                <span className="leading-none">{format(day, 'd')}</span>

                                {/* Mostrar bolinhas para revisões agendadas - VERSÃO COMPACTA */}
                                {dayInfo.hasFutureReviews && (
                                    <div className="flex gap-0.5 mt-1">
                                        {/* Apenas uma bolinha indicadora de estado prioritário */}
                                        {dayInfo.overdueCount > 0 ? (
                                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                        ) : dayInfo.todayCount > 0 ? (
                                            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                                        ) : (
                                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                        )}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Legenda Minimalista */}
                <div className="mt-4 flex flex-wrap justify-center gap-3 text-[9px] font-bold text-slate-500 uppercase">
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span>Estudou</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                        <span>Atrasado</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                        <span>Hoje</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                        <span>Futura</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
