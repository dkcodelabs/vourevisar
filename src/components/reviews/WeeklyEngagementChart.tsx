import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, TrendingUp, TrendingDown, Zap, Target } from 'lucide-react';
import { format, subDays, subWeeks, startOfDay, startOfWeek, endOfWeek, isSameDay, isWithinInterval } from 'date-fns';
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

type ViewMode = 'day' | 'month';

export const WeeklyEngagementChart: React.FC<WeeklyEngagementChartProps> = ({
    reviewData,
    subjects
}) => {
    const [calendarModalOpen, setCalendarModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [viewMode, setViewMode] = useState<ViewMode>('day');

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

    // Generate last 4 weeks for month view
    const weeklyData = useMemo(() => {
        return Array.from({ length: 4 }, (_, i) => {
            const weekEnd = endOfWeek(subWeeks(today, i), { weekStartsOn: 0 });
            const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 0 });

            const count = reviewData.filter(review => {
                const reviewDate = startOfDay(new Date(review.reviewed_at));
                return isWithinInterval(reviewDate, { start: weekStart, end: weekEnd });
            }).length;

            return {
                weekStart,
                weekEnd,
                label: i === 0 ? 'Atual' : `Sem ${4 - i}`,
                count,
                isCurrent: i === 0
            };
        }).reverse();
    }, [today, reviewData]);

    // Calculate totals
    const weekTotal = dailyReviews.reduce((sum, d) => sum + d.count, 0);
    const monthTotal = weeklyData.reduce((sum, w) => sum + w.count, 0);

    // Previous week comparison
    const lastWeekReviews = useMemo(() => {
        const lastWeekStart = subDays(today, 13);
        const lastWeekEnd = subDays(today, 7);

        return reviewData.filter(review => {
            const reviewDate = startOfDay(new Date(review.reviewed_at));
            return reviewDate >= lastWeekStart && reviewDate <= lastWeekEnd;
        }).length;
    }, [today, reviewData]);

    // Today's reviews
    const todayReviews = dailyReviews.find(d => d.isToday)?.count || 0;

    // Motivational message
    const motivationalMessage = useMemo(() => {
        const diff = weekTotal - lastWeekReviews;

        if (todayReviews === 0) {
            return { icon: Target, text: 'Nenhuma revisão hoje. Que tal começar?', color: 'text-amber-600 dark:text-amber-400' };
        }
        if (diff > 0) {
            return { icon: TrendingUp, text: `+${diff} vs semana passada. Continue!`, color: 'text-emerald-600 dark:text-emerald-400' };
        }
        if (diff < 0) {
            return { icon: TrendingDown, text: `${diff} vs semana passada. Retome!`, color: 'text-red-500 dark:text-red-400' };
        }
        return { icon: Zap, text: 'Mesmo ritmo da semana passada!', color: 'text-blue-600 dark:text-blue-400' };
    }, [weekTotal, lastWeekReviews, todayReviews]);

    // Find max for relative bar height
    const maxCount = viewMode === 'day'
        ? Math.max(...dailyReviews.map(d => d.count), 1)
        : Math.max(...weeklyData.map(w => w.count), 1);

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
            <Card className="glass-card border-0 shadow-sm h-full overflow-hidden">
                <CardContent className="p-5 h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 shrink-0">
                                <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                    {viewMode === 'day' ? 'Engajamento Semanal' : 'Engajamento Mensal'}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                    {viewMode === 'day' ? 'Últimos 7 dias' : 'Últimas 4 semanas'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Toggle buttons */}
                            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                                <button
                                    onClick={() => setViewMode('day')}
                                    className={`px-2 py-1 text-[9px] font-medium rounded-md transition-all ${viewMode === 'day'
                                        ? 'bg-card text-primary shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    Dia
                                </button>
                                <button
                                    onClick={() => setViewMode('month')}
                                    className={`px-2 py-1 text-[9px] font-medium rounded-md transition-all ${viewMode === 'month'
                                        ? 'bg-card text-primary shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    Mês
                                </button>
                            </div>
                            <button
                                onClick={handleOpenCalendar}
                                className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors shrink-0"
                                title="Ver calendário completo"
                            >
                                <Calendar className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Bar Chart */}
                    <div className="flex items-end justify-between gap-1 px-1 flex-1 min-h-[80px]">
                        {viewMode === 'day' ? (
                            // Day view
                            dailyReviews.map((day, index) => {
                                // Altura máxima da barra = 50px, mínimo para valores com dados = 8px
                                const maxBarHeight = 50;
                                const barHeightPx = day.count > 0
                                    ? Math.max(8, (day.count / maxCount) * maxBarHeight)
                                    : 4;

                                return (
                                    <div
                                        key={index}
                                        className="flex-1 flex flex-col items-center justify-end cursor-pointer group min-w-0 h-full"
                                        onClick={() => handleDayClick(day.date)}
                                    >
                                        {/* Count label - above bar */}
                                        <span className={`text-[10px] font-bold mb-1 ${day.count > 0
                                            ? 'text-slate-600 dark:text-slate-300'
                                            : 'text-slate-300 dark:text-slate-600'
                                            }`}>
                                            {day.count}
                                        </span>

                                        {/* Bar - grows upward */}
                                        <div
                                            className={`w-full max-w-[24px] rounded-t-md transition-all duration-300 group-hover:opacity-80 ${day.isToday
                                                ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-md shadow-indigo-200 dark:shadow-indigo-900/30'
                                                : day.count > 0
                                                    ? 'bg-gradient-to-t from-blue-500 to-blue-300 dark:from-blue-600 dark:to-blue-400'
                                                    : 'bg-slate-200 dark:bg-slate-700'
                                                }`}
                                            style={{ height: `${barHeightPx}px` }}
                                        />

                                        {/* Day label - below bar */}
                                        <div className="text-center mt-1 shrink-0">
                                            <p className={`text-[9px] font-medium leading-tight ${day.isToday
                                                ? 'text-indigo-600 dark:text-indigo-400'
                                                : 'text-slate-500 dark:text-slate-400'
                                                }`}>
                                                {day.dayName}
                                            </p>
                                            <p className={`text-[8px] leading-tight ${day.isToday
                                                ? 'text-indigo-500 dark:text-indigo-300 font-bold'
                                                : 'text-slate-400 dark:text-slate-500'
                                                }`}>
                                                {day.dayNumber}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            // Month/Week view
                            weeklyData.map((week, index) => {
                                // Altura máxima da barra = 50px, mínimo para valores com dados = 8px
                                const maxBarHeight = 50;
                                const barHeightPx = week.count > 0
                                    ? Math.max(8, (week.count / maxCount) * maxBarHeight)
                                    : 4;

                                return (
                                    <div
                                        key={index}
                                        className="flex-1 flex flex-col items-center justify-end cursor-pointer group min-w-0 h-full"
                                        onClick={() => handleDayClick(week.weekStart)}
                                    >
                                        {/* Count label */}
                                        <span className={`text-[10px] font-bold mb-1 ${week.count > 0
                                            ? 'text-slate-600 dark:text-slate-300'
                                            : 'text-slate-300 dark:text-slate-600'
                                            }`}>
                                            {week.count}
                                        </span>

                                        {/* Bar */}
                                        <div
                                            className={`w-full max-w-[32px] rounded-t-md transition-all duration-300 group-hover:opacity-80 ${week.isCurrent
                                                ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-md shadow-indigo-200 dark:shadow-indigo-900/30'
                                                : week.count > 0
                                                    ? 'bg-gradient-to-t from-blue-500 to-blue-300 dark:from-blue-600 dark:to-blue-400'
                                                    : 'bg-slate-200 dark:bg-slate-700'
                                                }`}
                                            style={{ height: `${barHeightPx}px` }}
                                        />

                                        {/* Week label */}
                                        <div className="text-center mt-1 shrink-0">
                                            <p className={`text-[9px] font-medium ${week.isCurrent
                                                ? 'text-indigo-600 dark:text-indigo-400'
                                                : 'text-slate-500 dark:text-slate-400'
                                                }`}>
                                                {week.label}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                {viewMode === 'day' ? 'Total da semana' : 'Total do mês'}
                            </span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                {viewMode === 'day' ? weekTotal : monthTotal} <span className="text-[10px] font-normal text-slate-400">revisões</span>
                            </span>
                        </div>
                        {/* Motivational message */}
                        <div className={`flex items-center gap-1.5 ${motivationalMessage.color}`}>
                            <motivationalMessage.icon className="w-3 h-3" />
                            <span className="text-[10px] font-medium">{motivationalMessage.text}</span>
                        </div>
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

