import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Zap, Clock, Award } from 'lucide-react';
import { useRealStatistics } from '@/hooks/useRealStatistics';
import { Skeleton } from '@/components/ui/skeleton';

export const DashboardInsights = () => {
    const {
        subjectPerformance,
        difficultyStats,
        studyHabits,
        spacedReviews
    } = useRealStatistics();

    // 1. Foco Agora (Matéria com menor desempenho que tem atividade)
    // Filtramos matérias com pelo menos 1 tópico concluído para não pegar matérias zeradas "novas"
    const worstSubject = [...subjectPerformance]
        .filter(s => s.completedTopics > 0)
        .sort((a, b) => a.completionPercentage - b.completionPercentage)[0];

    // 2. Vitórias Rápidas (Tópico fácil pendente)
    const easyTopic = difficultyStats.easiestPendingTopics[0];

    // 3. Taxa de Retenção
    const retentionRate = spacedReviews.onTimePercentage;

    if (!worstSubject && !easyTopic && !studyHabits.mostProductiveHour) {
        return null; // ou loading state
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Card 1: Foco Agora */}
            <Card className="bg-gradient-to-br from-red-50 to-white border-red-100 overflow-hidden relative">
                <CardContent className="p-4 relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-red-100 rounded-lg">
                            <Brain className="w-4 h-4 text-red-600" />
                        </div>
                        <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Foco Necessário</span>
                    </div>

                    {worstSubject ? (
                        <>
                            <h4 className="font-bold text-slate-900 line-clamp-1" title={worstSubject.name}>
                                {worstSubject.name}
                            </h4>
                            <p className="text-xs text-slate-600 mt-1">
                                Apenas {worstSubject.completionPercentage}% concluído.
                                <span className="block mt-0.5 text-red-600 font-medium">Priorize hoje!</span>
                            </p>
                        </>
                    ) : (
                        <p className="text-xs text-slate-500">Parabéns! Tudo equilibrado.</p>
                    )}
                </CardContent>
            </Card>

            {/* Card 2: Vitória Rápida */}
            <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100 overflow-hidden relative">
                <CardContent className="p-4 relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-emerald-100 rounded-lg">
                            <Zap className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Vitória Rápida</span>
                    </div>

                    {easyTopic ? (
                        <>
                            <h4 className="font-bold text-slate-900 line-clamp-1" title={easyTopic.name}>
                                {easyTopic.name}
                            </h4>
                            <p className="text-xs text-slate-600 mt-1">
                                Tópico fácil (Nível {easyTopic.difficulty}).
                                <span className="block mt-0.5 text-emerald-600 font-medium">Faça em 15min!</span>
                            </p>
                        </>
                    ) : (
                        <p className="text-xs text-slate-500">Sem tópicos fáceis pendentes.</p>
                    )}
                </CardContent>
            </Card>

            {/* Card 3: Insight de Produtividade */}
            <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100 overflow-hidden relative">
                <CardContent className="p-4 relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-indigo-100 rounded-lg">
                            <Clock className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Horário de Ouro</span>
                    </div>

                    <h4 className="font-bold text-slate-900">
                        {studyHabits.mostProductiveHour}h
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">
                        Seu pico de produtividade.
                        <span className="block mt-0.5 text-indigo-600 font-medium">Agende revisões difíceis!</span>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};
