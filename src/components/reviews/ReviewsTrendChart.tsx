import React, { useMemo, useState } from 'react';
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
import { TrendingUp, Clock, Calendar } from 'lucide-react';

interface Topic {
    first_studied_at: string | null;
    [key: string]: any;
}

interface ReviewHistoryItem {
    reviewed_at: string;
    [key: string]: any;
}

interface ReviewsTrendChartProps {
    topics: Topic[];
    reviewData: ReviewHistoryItem[];
    days?: number;
}

export const ReviewsTrendChart: React.FC<ReviewsTrendChartProps> = ({
    topics,
    reviewData,
    days = 14
}) => {
    const [viewMode, setViewMode] = useState<'days' | 'hours'>('days');

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
                // Adjust depending on reviewData structure. Assuming it has reviewed_at or date field.
                // Based on previous files, reviewData usually comes from topic_review_history joined with topics.
                // It likely has a 'reviewed_at' timestamp.
                const reviewedCount = reviewData.filter(r => {
                    // reviewData might be aggregated already or raw? 
                    // In WeeklyEngagementChart, reviewData was expected to be raw history items?
                    // Actually, in Revisoes.tsx, reviewData comes from 'topic_review_history'.
                    // Let's assume it has 'reviewed_at'.
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
                    // Filter by range? Maybe all time or just recent? Let's use recent range for consistency.
                    // For now, let's just do distribution of the INPUT data (which implies all time or filtered)
                    // But usually we want distribution of the displayed period.
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
        <div className="w-full bg-[#F8FAFC] dark:bg-slate-800/50 rounded-xl border border-slate-200/50 dark:border-slate-700/50 p-4">
            {/* Header Controls */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <TrendingUp size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tendência de Estudos</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Iniciadas vs Revisadas</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setViewMode('days')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${viewMode === 'days'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        <Calendar size={12} />
                        <span>Dias</span>
                    </button>
                    <button
                        onClick={() => setViewMode('hours')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${viewMode === 'hours'
                            ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        <Clock size={12} />
                        <span>Horas</span>
                    </button>
                </div>
            </div>

            {/* Chart Area */}
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
        </div>
    );
};
