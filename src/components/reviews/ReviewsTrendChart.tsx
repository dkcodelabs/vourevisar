import React, { useMemo } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { format, subDays, startOfDay, isSameDay, parseISO, getHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReviewHistoryItem } from '@/types/revision';

interface Topic {
    first_studied_at: string | null;
}

interface ReviewsTrendChartProps {
    topics: Topic[];
    reviewData: ReviewHistoryItem[];
    days?: number;
    viewMode: 'days' | 'hours';
}

export const ReviewsTrendChart: React.FC<ReviewsTrendChartProps> = ({
    topics,
    reviewData,
    days = 14,
    viewMode
}) => {
    // Process data for the chart
    const data = useMemo(() => {
        if (viewMode === 'days') {
            const result = [];
            const today = startOfDay(new Date());

            for (let i = days - 1; i >= 0; i--) {
                const date = subDays(today, i);
                const dateStr = format(date, 'yyyy-MM-dd');

                // Count started topics (first_studied_at)
                const startedCount = topics.filter(t => {
                    if (!t.first_studied_at) return false;
                    return isSameDay(parseISO(t.first_studied_at), date);
                }).length;

                // Count reviews done (from history)
                const reviewedCount = reviewData.filter(r => {
                    const rDate = r.reviewed_at ? parseISO(r.reviewed_at) : new Date();
                    return isSameDay(rDate, date);
                }).length;

                result.push({
                    date: dateStr,
                    displayDate: format(date, 'dd/MM', { locale: ptBR }),
                    fullDate: format(date, "d 'de' MMMM", { locale: ptBR }),
                    started: startedCount,
                    reviewed: reviewedCount
                });
            }
            return result;
        } else {
            // Hourly distribution (Total over the period)
            const hours = Array.from({ length: 24 }, (_, i) => ({
                hour: i,
                label: `${i}h`,
                started: 0,
                reviewed: 0
            }));

            // Aggregate started
            topics.forEach(t => {
                if (t.first_studied_at) {
                    const d = parseISO(t.first_studied_at);
                    const today = new Date();
                    const cutoff = subDays(today, days);
                    if (d >= cutoff) {
                        const h = getHours(d);
                        hours[h].started++;
                    }
                }
            });

            // Aggregate reviewed
            reviewData.forEach(r => {
                if (r.reviewed_at) {
                    const d = parseISO(r.reviewed_at);
                    const today = new Date();
                    const cutoff = subDays(today, days);
                    if (d >= cutoff) {
                        const h = getHours(d);
                        hours[h].reviewed++;
                    }
                }
            });

            return hours;
        }
    }, [topics, reviewData, days, viewMode]);

    return (
        <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorStarted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorReviewed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis
                        dataKey={viewMode === 'days' ? "displayDate" : "label"}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        dy={10}
                        interval={viewMode === 'hours' ? 3 : 'preserveStartEnd'}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            borderColor: '#e2e8f0',
                            borderRadius: '8px',
                            fontSize: '12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                        cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="started"
                        name="Iniciadas"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorStarted)"
                    />
                    <Area
                        type="monotone"
                        dataKey="reviewed"
                        name="Revisadas"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorReviewed)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
