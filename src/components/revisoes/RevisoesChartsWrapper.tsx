import React, { useState } from 'react';
import { Sparkles, Calendar, Clock } from 'lucide-react';
import { ReviewsTrendChart } from '@/components/reviews/ReviewsTrendChart';
import { WeeklyEngagementChart } from '@/components/reviews/WeeklyEngagementChart';
import { ReviewsStatsCard } from '@/components/reviews/ReviewsStatsCard';
import { ReviewProfile } from '@/types/study';
import { RevisionItem } from '@/types/revision';

interface RevisoesChartsWrapperProps {
    isVisible: boolean;
    stats: any; // Using any for stats to match flexibility, but could be typed strictly if needed
    topics: RevisionItem[];
    reviewData: any[];
    subjects: any[];
    userProfile: ReviewProfile;
    maxReviews: number;
}

export const RevisoesChartsWrapper: React.FC<RevisoesChartsWrapperProps> = ({
    isVisible,
    stats,
    topics,
    reviewData,
    subjects,
    userProfile,
    maxReviews
}) => {
    const [trendViewMode, setTrendViewMode] = useState<'days' | 'hours'>('days');

    if (!isVisible) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Left: Tendência de Estudos */}
            <div className="glass-card p-5 flex flex-col h-full min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 shrink-0">
                            <Sparkles size={16} className="text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider truncate">
                                Tendência de Estudos
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                Iniciadas vs Revisadas
                            </p>
                        </div>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 shrink-0">
                        <button
                            onClick={() => setTrendViewMode('days')}
                            className={`flex items-center gap-1 px-2 py-1 text-[9px] font-medium rounded-md transition-all ${trendViewMode === 'days'
                                ? 'bg-card text-primary shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <Calendar size={10} />
                            Dias
                        </button>
                        <button
                            onClick={() => setTrendViewMode('hours')}
                            className={`flex items-center gap-1 px-2 py-1 text-[9px] font-medium rounded-md transition-all ${trendViewMode === 'hours'
                                ? 'bg-card text-primary shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <Clock size={10} />
                            Horas
                        </button>
                    </div>
                </div>
                {/* Chart */}
                <div className="flex-1 flex items-end min-w-0">
                    <ReviewsTrendChart topics={topics as unknown as Array<{ first_studied_at: string | null;[key: string]: any }>} reviewData={reviewData || []} viewMode={trendViewMode} />
                </div>
                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-violet-500 shrink-0"></div>
                            <span>Iniciadas</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-cyan-500"></div>
                            <span>Revisadas</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Middle: Weekly Engagement Chart */}
            <div className="h-full min-w-0">
                <WeeklyEngagementChart
                    reviewData={reviewData || []}
                    subjects={subjects}
                />
            </div>

            {/* Right: Stats Card */}
            <div className="h-full min-w-0">
                <ReviewsStatsCard
                    totalTopics={stats.totalTopics}
                    totalScheduledReviews={stats.totalScheduledReviews}
                    startedTopicsCount={stats.startedTopicsCount}
                    completedTopicsCount={stats.completedTopicsCount}
                    completedReviews={stats.completedReviews}
                    pendingReviews={stats.pendingReviews}
                    notStartedReviews={stats.notStartedReviews}
                    overdue={stats.overdue}
                    today={stats.today}
                    future={stats.future}
                    reviewProfile={userProfile}
                    maxReviews={maxReviews}
                    className="h-full"
                />
            </div>
        </div>
    );
};
