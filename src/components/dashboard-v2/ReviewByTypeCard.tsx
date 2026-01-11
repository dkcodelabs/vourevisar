import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserSettings } from '@/hooks/useUserSettings';
import { Subject, Topic } from '@/types';
import { REVIEW_PROFILES } from '@/types/study';
import { BarChart3 } from 'lucide-react';

interface ReviewByTypeCardProps {
    subjects: Subject[];
    className?: string;
}

export const ReviewByTypeCard: React.FC<ReviewByTypeCardProps> = ({ subjects, className }) => {
    const { getProfileInfo } = useUserSettings();
    const profileInfo = getProfileInfo();
    // Se não houver info, fallback para INTERMEDIATE (padrão seguro)
    const userProfile = profileInfo?.profile || 'INTERMEDIATE';
    const intervals = REVIEW_PROFILES[userProfile].intervals;

    // Calcular distribuição
    const distribution = React.useMemo(() => {
        const counts: Record<string, number> = {};

        // Inicializar contadores para todos os intervalos do perfil
        intervals.forEach((_, index) => {
            counts[index + 1] = 0; // index 0 (24h) -> reviewCount 1
        });
        // Adicionar contador para concluídos (estágio > max)
        const completedKey = intervals.length + 1;
        counts[completedKey] = 0;

        let totalActive = 0;

        subjects.forEach(subject => {
            subject.topics.forEach(topic => {
                const stage = topic.reviewCount || topic.review_count || 1; // Default to 1 if missing

                // Se stage for maior que o número de intervalos, conta como "Concluído" ou último estágio
                // A lógica do sistema parece tratar "Concluído" separado
                if (topic.reviewStage === 'Concluído' || topic.completed) {
                    counts[completedKey]++;
                } else {
                    // Garante que o stage está dentro dos limites visuais, senão agrupa no último
                    const key = Math.min(stage, intervals.length);

                    // Incrementa
                    counts[key] = (counts[key] || 0) + 1;
                    totalActive++;
                }
            });
        });

        return { counts, total: totalActive, completedKey };
    }, [subjects, intervals]);

    const getLabel = (intervalDays: number) => {
        if (intervalDays === 1) return '24h';
        if (intervalDays < 30) return `${intervalDays}d`;
        return `${Math.floor(intervalDays / 30)}m`; // 30d -> 1m, 60d -> 2m
    };

    const maxCount = Math.max(...Object.values(distribution.counts));

    return (
        <div className={`flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}>
            <div className="p-5 flex flex-col h-full">
                {/* Header Minimalista */}
                <div className="flex items-center gap-2.5 mb-6">
                    <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 shrink-0">
                        <BarChart3 className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                            Distribuição
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            Por tipo de revisão
                        </p>
                    </div>
                </div>

                {/* Chart Content */}
                <div className="flex-1 space-y-4">
                    {intervals.map((days, index) => {
                        const count = distribution.counts[index + 1] || 0;
                        const percentage = distribution.total > 0 ? (count / distribution.total) * 100 : 0;
                        const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;

                        return (
                            <div key={days} className="group">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 w-8">
                                        {getLabel(days)}
                                    </span>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                        {count}
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-orange-400 dark:bg-orange-500 rounded-full transition-all duration-500 group-hover:bg-orange-500 dark:group-hover:bg-orange-400"
                                        style={{ width: `${barWidth}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
