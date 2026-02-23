import React from 'react';
import { Brain, Zap, Clock } from 'lucide-react';
import { useRealStatistics } from '@/hooks/useRealStatistics';

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-6">
            {/* Card 1: Foco Agora */}
            <div className="glow-card p-6 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center justify-between mb-6">
                    <span className="data-label">Foco Necessário</span>
                    <Brain className="text-red-500 opacity-80" size={20} />
                </div>

                {worstSubject ? (
                    <div>
                        <h4 className="text-2xl font-black text-foreground line-clamp-1" title={worstSubject.name}>
                            {worstSubject.name}
                        </h4>
                        <div className="flex flex-col gap-1 mt-1">
                            <p className="text-sm font-bold text-muted-foreground">Apenas {worstSubject.completionPercentage}% concluído.</p>
                            <p className="text-[10px] font-bold text-red-500 opacity-60 uppercase">Priorize hoje!</p>
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className="text-sm font-bold text-muted-foreground">Parabéns! Tudo equilibrado.</p>
                    </div>
                )}
            </div>

            {/* Card 2: Vitória Rápida */}
            <div className="glow-card p-6 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center justify-between mb-6">
                    <span className="data-label">Vitória Rápida</span>
                    <Zap className="text-emerald-500 opacity-80" size={20} />
                </div>

                {easyTopic ? (
                    <div>
                        <h4 className="text-2xl font-black text-foreground line-clamp-1" title={easyTopic.name}>
                            {easyTopic.name}
                        </h4>
                        <div className="flex flex-col gap-1 mt-1">
                            <p className="text-sm font-bold text-muted-foreground">Tópico fácil (Nível {easyTopic.difficulty}).</p>
                            <p className="text-[10px] font-bold text-emerald-500 opacity-60 uppercase">Faça em 15min!</p>
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className="text-sm font-bold text-muted-foreground">Sem tópicos fáceis pendentes.</p>
                    </div>
                )}
            </div>

            {/* Card 3: Insight de Produtividade */}
            <div className="glow-card p-6 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center justify-between mb-6">
                    <span className="data-label">Horário de Ouro</span>
                    <Clock className="text-primary opacity-80" size={20} />
                </div>

                <div>
                    <h4 className="text-4xl font-black text-foreground">
                        {studyHabits.mostProductiveHour}h
                    </h4>
                    <div className="flex flex-col gap-1 mt-1">
                        <p className="text-sm font-bold text-muted-foreground">Seu pico de produtividade.</p>
                        <p className="text-[10px] font-bold text-primary opacity-60 uppercase">Agende revisões difíceis!</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
