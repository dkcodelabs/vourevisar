import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, TrendingUp } from 'lucide-react';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StreakCalendarModal } from '@/components/dashboard/StreakCalendarModal';

interface WeeklyEngagementChartProps {
    reviewData: any[];
    subjects: any[];
}

// Map to 3-letter day names in Portuguese
const DAY_NAMES: Record<string, string> = {
    'dom': 'Dom',
    'seg': 'Seg',
    'ter': 'Ter',
    'qua': 'Qua',
    'qui': 'Qui',
    'sex': 'Sex',
    'sáb': 'Sáb'
};

export const WeeklyEngagementChart: React.FC<WeeklyEngagementChartProps> = ({
    reviewData,
    subjects
}) => {
    const [calendarModalOpen, setCalendarModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

    const today = startOfDay(new Date());

    // Generate last 7 days (sliding window)
    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const date = subDays(today, 6 - i);
            const rawName = format(date, 'EEE', { locale: ptBR }).toLowerCase().replace('.', '');
            return {
                date,
                dayName: DAY_NAMES[rawName] || rawName.slice(0, 3),
                dayNumber: format(date, 'd'),
                isToday: isSameDay(date, today)
            };
        });
    }, [today]);

    // Calculate reviews per day
    const dailyReviews = useMemo(() => {
        const counts: Record<string, number> = {};

        weekDays.forEach(day => {
            const dateKey = format(day.date, 'yyyy-MM-dd');
            counts[dateKey] = 0;
        });

        reviewData.forEach(review => {
            const reviewDate = startOfDay(new Date(review.reviewed_at));
            const dateKey = format(reviewDate, 'yyyy-MM-dd');
            if (counts[dateKey] !== undefined) {
                counts[dateKey]++;
            }
        });

        return weekDays.map(day => ({
            ...day,
            count: counts[format(day.date, 'yyyy-MM-dd')] || 0
        }));
    }, [weekDays, reviewData]);

    // Find max for relative bar height
    const maxCount = Math.max(...dailyReviews.map(d => d.count), 1);

    // Total this week
    const weekTotal = dailyReviews.reduce((sum, d) => sum + d.count, 0);

    const handleDayClick = (date: Date) => {
        setSelectedDate(date);
        setCalendarModalOpen(true);
    };

    const handleOpenCalendar = () => {
        setSelectedDate(undefined);
        setCalendarModalOpen(true);
    };

    return (
        <>
            <Card className="border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900 h-full overflow-hidden">
                <CardContent className="p-5 h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 shrink-0">
                                <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Engajamento Semanal</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500">Últimos 7 dias</p>
                            </div>
                        </div>
                        <button
                            onClick={handleOpenCalendar}
                            className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors shrink-0"
                            title="Ver calendário completo"
                        >
                            <Calendar className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Bar Chart */}
                    <div className="flex-1 flex items-end gap-2 min-h-[110px] overflow-hidden px-1">
                        {dailyReviews.map((day, index) => {
                            const barHeight = day.count > 0 ? Math.max(18, (day.count / maxCount) * 100) : 8;

                            return (
                                <div
                                    key={index}
                                    className="flex-1 flex flex-col items-center cursor-pointer group min-w-0"
                                    onClick={() => handleDayClick(day.date)}
                                >
                                    {/* Count label */}
                                    <span className={`text-[10px] font-bold mb-1.5 ${day.count > 0
                                            ? 'text-slate-600 dark:text-slate-300'
                                            : 'text-slate-300 dark:text-slate-600'
                                        }`}>
                                        {day.count}
                                    </span>

                                    {/* Bar container */}
                                    <div className="flex-1 w-full flex items-end justify-center">
                                        <div
                                            className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 group-hover:opacity-80 ${day.isToday
                                                    ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-md shadow-indigo-200 dark:shadow-indigo-900/30'
                                                    : day.count > 0
                                                        ? 'bg-gradient-to-t from-blue-500 to-blue-300 dark:from-blue-600 dark:to-blue-400'
                                                        : 'bg-slate-200 dark:bg-slate-700'
                                                }`}
                                            style={{ height: `${barHeight}%`, minHeight: '6px' }}
                                        />
                                    </div>

                                    {/* Day label */}
                                    <div className="text-center mt-1.5 shrink-0">
                                        <p className={`text-[10px] font-medium ${day.isToday
                                                ? 'text-indigo-600 dark:text-indigo-400'
                                                : 'text-slate-500 dark:text-slate-400'
                                            }`}>
                                            {day.dayName}
                                        </p>
                                        <p className={`text-[9px] leading-tight ${day.isToday
                                                ? 'text-indigo-500 dark:text-indigo-300 font-bold'
                                                : 'text-slate-400 dark:text-slate-500'
                                            }`}>
                                            {day.dayNumber}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">Total da semana</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {weekTotal} <span className="text-[10px] font-normal text-slate-400">revisões</span>
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Calendar Modal */}
            <StreakCalendarModal
                isOpen={calendarModalOpen}
                onClose={() => setCalendarModalOpen(false)}
                subjects={subjects}
                selectedDate={selectedDate}
                reviewData={reviewData}
            />
        </>
    );
};

export default WeeklyEngagementChart;
