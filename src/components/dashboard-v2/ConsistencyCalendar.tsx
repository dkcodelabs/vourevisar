import React, { useMemo } from 'react';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Circle } from 'lucide-react';

interface ConsistencyCalendarProps {
    reviewData: Array<{ reviewed_at: string | null }>;
    daysCount?: number;
}

export const ConsistencyCalendar = ({ reviewData, daysCount = 7 }: ConsistencyCalendarProps) => {
    // Generate active dates based on reviewData log
    const activeDates = useMemo(() => {
        const activeSet = new Set<string>();
        
        if (!reviewData?.length) return activeSet;

        reviewData.forEach(review => {
            if (review.reviewed_at) {
                const date = new Date(review.reviewed_at);
                activeSet.add(format(date, 'yyyy-MM-dd'));
            }
        });
        return activeSet;
    }, [reviewData]);

    const days = useMemo(() => {
        const today = startOfDay(new Date());
        return Array.from({ length: daysCount }).map((_, i) => {
            const date = subDays(today, daysCount - 1 - i);
            const dateString = format(date, 'yyyy-MM-dd');
            return {
                date,
                isToday: isSameDay(date, today),
                isActive: activeDates.has(dateString),
                label: format(date, "d MMM", { locale: ptBR }),
                shortLabel: format(date, 'dd/MM')
            };
        });
    }, [activeDates, daysCount]);

    // Mês e ano do último dia (hoje)
    const currentMonthLabel = useMemo(() => {
        return format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });
    }, []);

    return (
        <div className="flex flex-col gap-3 w-full">
            {/* Label do mês atual */}
            <span className="text-[10px] font-bold text-[#e4beb4]/40 uppercase tracking-widest px-2 capitalize">
                {currentMonthLabel}
            </span>

            <div className="flex justify-between items-start w-full px-2">
                {days.map((day, i) => {
                    const isActive = day.isActive;

                    return (
                        <div key={i} className="flex flex-col items-center gap-2 relative group/day cursor-default">
                            <span className={`text-[10px] font-bold uppercase tracking-tighter ${
                                day.isToday ? 'text-[#ff5722]' : 'text-[#e4beb4]/60'
                            }`}>
                                {format(day.date, 'eee', { locale: ptBR }).substring(0, 3)}
                            </span>
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    day.isToday
                                        ? 'ring-2 ring-[#ff5722] ring-offset-2 ring-offset-transparent '
                                        : ''
                                }${
                                    isActive
                                        ? 'bg-[#44d8f1]/10 text-[#44d8f1]'
                                        : 'bg-[#353534] text-[#e4beb4]/20'
                                }`}
                            >
                                {isActive ? (
                                    <>
                                        <CheckCircle2 className="w-5 h-5 fill-current opacity-20" strokeWidth={1.5} />
                                        <CheckCircle2 className="w-5 h-5 absolute" strokeWidth={2.5} />
                                    </>
                                ) : (
                                    <Circle className="w-5 h-5" strokeWidth={1.5} />
                                )}
                            </div>

                            {/* Label abaixo do círculo: Data ou "Hoje" */}
                            <span className={`text-[9px] font-bold mt-2 uppercase tracking-tight ${
                                day.isToday ? 'text-[#ff5722]' : 'text-[#e4beb4]/40'
                            }`}>
                                {day.isToday ? 'Hoje' : day.shortLabel}
                            </span>

                            {/* Tooltip Hover */}
                            <div className="absolute bottom-full mb-2 opacity-0 group-hover/day:opacity-100 transition-opacity pointer-events-none z-10 w-max bg-[#1f1f1f] border border-[#353534] text-white text-[10px] px-2 py-1 rounded shadow-xl font-['Inter']">
                                <span className="font-bold">{day.label}</span>
                                {day.isToday && <span className="text-[#ff5722] ml-1">(Hoje)</span>}
                                <div className="text-[9px] mt-0.5 text-[#e4beb4]">
                                    {isActive ? 'Meta atingida' : 'Sem registros'}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
