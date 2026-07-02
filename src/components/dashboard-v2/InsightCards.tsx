import React from 'react';
import { Brain, Zap, Clock, Flame, AlertTriangle, TrendingDown, ArrowRight } from 'lucide-react';
import { useMentorInsights } from '@/hooks/useMentorInsights';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SubjectInsight {
    name: string;
    completionPercentage: number;
}

interface TopicInsight {
    name: string;
    difficulty: number;
}

interface StudyHabitsInsight {
    mostProductiveHour?: number | null;
}

// ──────────────────────────────────────────────
// NeedsFocusCard — alimentado pelo Mentor IA
// Mostra até 3 matérias críticas com dados reais
// ──────────────────────────────────────────────
export const NeedsFocusCard: React.FC<{ worstSubject?: SubjectInsight }> = ({ worstSubject }) => {
    const navigate = useNavigate();
    const { criticalAlerts, gargalos } = useMentorInsights();

    // Prioridade: alertas críticos (Nível 1) > gargalos (Nível 2) > pior matéria por %
    const mentorItems = React.useMemo(() => {
        const items: Array<{
            id: string;
            name: string;
            detail: string;
            level: 'critical' | 'warning' | 'fallback';
            topicId?: string;
        }> = [];

        // Nível 1: críticos por importância e atraso
        criticalAlerts.slice(0, 2).forEach(alert => {
            items.push({
                id: alert.id,
                name: alert.subjectName,
                detail: alert.daysOverdue
                    ? `${alert.daysOverdue} dia${alert.daysOverdue > 1 ? 's' : ''} em atraso`
                    : alert.message,
                level: 'critical',
                topicId: alert.topicId,
            });
        });

        // Nível 2: gargalos de desempenho, sem repetir matéria já listada
        const listedSubjects = new Set(items.map(i => i.name));
        gargalos.forEach(alert => {
            if (items.length >= 3) return;
            if (listedSubjects.has(alert.subjectName)) return;
            items.push({
                id: alert.id,
                name: alert.subjectName,
                detail: 'Retenção caindo',
                level: 'warning',
                topicId: alert.topicId,
            });
            listedSubjects.add(alert.subjectName);
        });

        // Fallback: pior matéria por percentual (dado do Dashboard)
        if (items.length === 0 && worstSubject) {
            items.push({
                id: 'fallback-worst',
                name: worstSubject.name,
                detail: `${worstSubject.completionPercentage}% concluído`,
                level: 'fallback',
            });
        }

        return items;
    }, [criticalAlerts, gargalos, worstSubject]);

    const hasMentorData = mentorItems.length > 0 && mentorItems[0].level !== 'fallback';

    return (
        <div className="glow-card p-5 rounded-3xl relative overflow-hidden group h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Foco Necessário
                </span>
                <Brain className="text-red-500 opacity-80" size={18} />
            </div>

            <div className="flex flex-col flex-1 gap-2 justify-start">
                {mentorItems.length > 0 ? (
                    <>
                        {mentorItems.map((item, idx) => (
                            <button
                                key={item.id}
                                onClick={() => item.topicId
                                    ? navigate(`/revisoes?topicId=${item.topicId}`)
                                    : navigate('/revisoes')
                                }
                                className={cn(
                                    "w-full text-left flex items-center gap-2.5 p-2.5 rounded-xl transition-colors group/item",
                                    item.level === 'critical'
                                        ? "bg-rose-500/8 hover:bg-rose-500/15 border border-rose-500/15"
                                        : item.level === 'warning'
                                            ? "bg-amber-500/8 hover:bg-amber-500/15 border border-amber-500/15"
                                            : "bg-secondary hover:bg-accent border border-border"
                                )}
                            >
                                <div className={cn(
                                    "shrink-0 w-6 h-6 rounded-lg flex items-center justify-center",
                                    item.level === 'critical' ? "bg-rose-500/15" :
                                    item.level === 'warning' ? "bg-amber-500/15" : "bg-secondary"
                                )}>
                                    {item.level === 'critical'
                                        ? <Flame className="w-3.5 h-3.5 text-rose-500" />
                                        : item.level === 'warning'
                                            ? <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
                                            : <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-foreground truncate leading-tight">
                                        {item.name}
                                    </p>
                                    <p className={cn(
                                        "text-[10px] font-semibold leading-tight",
                                        item.level === 'critical' ? "text-rose-500" :
                                        item.level === 'warning' ? "text-amber-500" : "text-muted-foreground"
                                    )}>
                                        {item.detail}
                                    </p>
                                </div>
                                <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0" />
                            </button>
                        ))}

                        {hasMentorData && (
                            <p className="text-[10px] text-muted-foreground/60 mt-1 pl-1">
                                Baseado nas revisões em atraso do ciclo atual
                            </p>
                        )}
                    </>
                ) : (
                    <>
                        <h4 className="text-xl font-black text-foreground">Tudo OK</h4>
                        <p className="text-xs font-bold text-muted-foreground">
                            Nenhum alerta ativo no ciclo.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────
// QuickWinCard — sem alterações de lógica
// ──────────────────────────────────────────────
export const QuickWinCard: React.FC<{ easyTopic: TopicInsight | null }> = ({ easyTopic }) => {
    return (
        <div className="glow-card p-5 rounded-3xl relative overflow-hidden group h-full">
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
                        <h4 className="text-xl font-black text-foreground">Nenhuma</h4>
                        <div className="flex flex-col gap-1 mt-1">
                            <p className="text-xs font-bold text-muted-foreground">Sem tópicos fáceis pendentes.</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────
// GoldenHourCard — sem alterações de lógica
// ──────────────────────────────────────────────
export const GoldenHourCard: React.FC<{ studyHabits: StudyHabitsInsight | null }> = ({ studyHabits }) => {
    return (
        <div className="glow-card p-5 rounded-3xl relative overflow-hidden group h-full">
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
                        <h4 className="text-xl font-black text-foreground">Sem dados</h4>
                        <div className="flex flex-col gap-1 mt-1">
                            <p className="text-xs font-bold text-muted-foreground">Estude mais para calcular.</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
