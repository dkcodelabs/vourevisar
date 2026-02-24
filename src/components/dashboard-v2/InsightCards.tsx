import React from 'react';
import { Brain, Zap, Clock } from 'lucide-react';

interface InsightStats {
    subjectPerformance: any[];
    difficultyStats: any;
    studyHabits: any;
}

export const NeedsFocusCard: React.FC<{ worstSubject: any }> = ({ worstSubject }) => {
    return (
        <div className="glow-card p-5 rounded-3xl relative overflow-hidden group h-full bg-white dark:bg-[#181A1C]">
            <div className="flex items-center justify-between mb-4">
                <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Foco Necessário</span>
                <Brain className="text-red-500 opacity-80" size={18} />
            </div>

            <div className="flex flex-col flex-1 justify-end">
                {worstSubject ? (
                    <>
                        <h4 className="text-xl font-black text-foreground line-clamp-1" title={worstSubject.name}>
                            {worstSubject.name}
                        </h4>
                        <div className="flex flex-col gap-1 mt-1">
                            <p className="text-xs font-bold text-muted-foreground">Apenas {worstSubject.completionPercentage}% concluído.</p>
                            <p className="text-[10px] font-bold text-red-500 opacity-60 uppercase">Priorize hoje!</p>
                        </div>
                    </>
                ) : (
                    <>
                        <h4 className="text-xl font-black text-foreground">
                            Tudo OK
                        </h4>
                        <div className="flex flex-col gap-1 mt-1">
                            <p className="text-xs font-bold text-muted-foreground">Parabéns! Tudo equilibrado.</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export const QuickWinCard: React.FC<{ easyTopic: any }> = ({ easyTopic }) => {
    return (
        <div className="glow-card p-5 rounded-3xl relative overflow-hidden group h-full bg-white dark:bg-[#181A1C]">
            <div className="flex items-center justify-between mb-4">
                <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Vitória Rápida</span>
                <Zap className="text-emerald-500 opacity-80" size={18} />
            </div>

            <div className="flex flex-col flex-1 justify-end">
                {easyTopic ? (
                    <>
                        <h4 className="text-xl font-black text-foreground line-clamp-1" title={easyTopic.name}>
                            {easyTopic.name}
                        </h4>
                        <div className="flex flex-col gap-1 mt-1">
                            <p className="text-xs font-bold text-muted-foreground">Tópico fácil (Nível {easyTopic.difficulty}).</p>
                            <p className="text-[10px] font-bold text-emerald-500 opacity-60 uppercase">Faça em 15min!</p>
                        </div>
                    </>
                ) : (
                    <>
                        <h4 className="text-xl font-black text-foreground">
                            Nenhuma
                        </h4>
                        <div className="flex flex-col gap-1 mt-1">
                            <p className="text-xs font-bold text-muted-foreground">Sem tópicos fáceis pendentes.</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export const GoldenHourCard: React.FC<{ studyHabits: any }> = ({ studyHabits }) => {
    return (
        <div className="glow-card p-5 rounded-3xl relative overflow-hidden group h-full bg-white dark:bg-[#181A1C]">
            <div className="flex items-center justify-between mb-4">
                <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Horário de Ouro</span>
                <Clock className="text-primary opacity-80" size={18} />
            </div>

            <div className="flex flex-col flex-1 justify-end">
                {studyHabits?.mostProductiveHour ? (
                    <>
                        <h4 className="text-3xl font-black text-foreground">
                            {studyHabits.mostProductiveHour}h
                        </h4>
                        <div className="flex flex-col gap-1 mt-1">
                            <p className="text-xs font-bold text-muted-foreground">Seu pico de produtividade.</p>
                            <p className="text-[10px] font-bold text-primary opacity-60 uppercase">Agende revisões difíceis!</p>
                        </div>
                    </>
                ) : (
                    <>
                        <h4 className="text-xl font-black text-foreground">
                            Sem dados
                        </h4>
                        <div className="flex flex-col gap-1 mt-1">
                            <p className="text-xs font-bold text-muted-foreground">Estude mais para calcular.</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
