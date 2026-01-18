import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfDay, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Subject } from '@/types';
import { cn } from "@/lib/utils";

interface DashboardCalendarProps {
    subjects: Subject[];
    reviewData?: any[];
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
        <Card className={cn("flex flex-col h-full border-0 shadow-sm", className)}>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
                    <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    Calendário de Estudos
                </CardTitle>

                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-lg">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateMonth('prev')}
                        className="h-7 w-7 p-0 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-md"
                    >
                        <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    </Button>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 min-w-[100px] text-center capitalize">
                        {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateMonth('next')}
                        // Bloqueia meses futuros se não houver dados, mas geralmente deixamos aberto
                        // disabled={isSameMonth(currentMonth, new Date())} 
                        className="h-7 w-7 p-0 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-md"
                    >
                        <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col justify-center">
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
                                className={`
                      aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all duration-200 relative
                      ${isToday
                                        ? 'bg-blue-50 text-blue-700 border border-blue-500 font-semibold shadow-sm'
                                        : showAsStudied
                                            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                            : 'bg-gray-50 text-gray-400 border border-gray-100 hover:bg-gray-100'
                                    }
                    `}
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
                <div className="mt-6 flex flex-wrap justify-center gap-4 text-[10px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span>Estudou</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                        <span>Atrasado</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                        <span>Hoje</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                        <span>Futura</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
