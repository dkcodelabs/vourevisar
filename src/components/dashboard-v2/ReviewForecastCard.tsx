import React, { useMemo } from 'react';
import { Subject } from '@/types';
import { startOfDay, addDays, isBefore, isSameDay, isAfter } from 'date-fns';
import {
    CalendarClock,
    AlertCircle,
    CheckCircle2,
    TrendingUp,
    Info
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ReviewForecastCardProps {
    subjects: Subject[];
    className?: string;
    dailyCapacity?: number; // Capacidade sugerida, default 10
}

export const ReviewForecastCard: React.FC<ReviewForecastCardProps> = ({
    subjects,
    className,
    dailyCapacity = 10
}) => {
    const today = startOfDay(new Date());
    const nextWeek = addDays(today, 7);

    const stats = useMemo(() => {
        let overdue = 0;
        let dueToday = 0;
        let future = 0; // Total futuras (geral)

        // Contagem para Impacto da Semana (Janela 7 dias)
        // Isso inclui apenas o que VENCE nos próximos 7 dias
        let incoming7Days = 0;

        subjects.forEach(subject => {
            subject.topics.forEach(topic => {
                if (!topic.nextReview) return;

                const reviewDate = startOfDay(new Date(topic.nextReview));

                if (isBefore(reviewDate, today)) {
                    overdue++;
                } else if (isSameDay(reviewDate, today)) {
                    dueToday++;
                } else {
                    future++; // Conta para o Total Geral

                    // Forecast: Pega o que vence AMANHÃ até D+7
                    if (isBefore(reviewDate, nextWeek) || isSameDay(reviewDate, nextWeek)) {
                        incoming7Days++;
                    }
                }
            });
        });

        const totalGeral = overdue + dueToday + future;

        // --- Lógica 2: Execução Sugerida Hoje ---
        const pendentesHoje = overdue + dueToday;
        // ExecucaoSugerida = min(PendentesHoje, CapacidadeDiaria)
        const execucaoSugerida = Math.min(pendentesHoje, dailyCapacity);

        // --- Nova Lógica: Feedback de Progresso Diário ---
        // Conta tópicos revisados HOJE (last_reviewed_at == today)
        let concluidasHoje = 0;
        subjects.forEach(subject => {
            subject.topics.forEach(topic => {
                if (topic.last_reviewed_at) {
                    const lastReviewDate = startOfDay(new Date(topic.last_reviewed_at));
                    if (isSameDay(lastReviewDate, today)) {
                        concluidasHoje++;
                    }
                }
            });
        });

        // --- Lógica 3: Simulação — Impacto da Semana (7 dias) ---
        // ImpactoSemana = Atrasadas + Hoje + Incoming7Days
        const impactoSemana = overdue + dueToday + incoming7Days;

        // RitmoMedio = ImpactoSemana / 7
        const ritmoMedio = Math.ceil(impactoSemana / 7);

        return {
            overdue,
            dueToday,
            future,
            totalGeral,
            pendentesHoje,
            execucaoSugerida,
            impactoSemana,
            ritmoMedio,
            concluidasHoje
        };
    }, [subjects, today, nextWeek, dailyCapacity]);

    return (
        <div className={`flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}>
            <div className="p-5 flex flex-col h-full space-y-6">

                {/* 1. Raio-X das Revisões (Diagnóstico – NÃO EXECUTA) */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <CalendarClock className="w-4 h-4 text-indigo-500" />
                            Raio-X das Revisões
                        </h3>
                        <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mt-1">
                            Total geral de revisões: <span className="text-slate-900 dark:text-white font-bold">{stats.totalGeral}</span>
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {/* Atrasadas */}
                    <div className="flex flex-col p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-1">Atrasadas</span>
                        <div className="flex items-baseline gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 translate-y-[1px]" />
                            <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{stats.overdue}</span>
                        </div>
                    </div>

                    {/* Vence Hoje */}
                    <div className="flex flex-col p-3 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500 mb-1">Vence Hoje</span>
                        <div className="flex items-baseline gap-1">
                            <CalendarClock className="w-3.5 h-3.5 text-orange-500 translate-y-[1px]" />
                            <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{stats.dueToday}</span>
                        </div>
                    </div>

                    {/* Futuras */}
                    <div className="flex flex-col p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-1">Futuras</span>
                        <div className="flex items-baseline gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 translate-y-[1px]" />
                            <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{stats.future}</span>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                {/* 2. Execução Sugerida Hoje (ÚNICO BLOCO QUE ORIENTA AÇÃO) */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Execução Sugerida
                        </h4>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-xl p-3.5 space-y-2">
                        {/* Linha 1: Estado do Sistema (O que falta) */}
                        <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                            Há <span className="font-bold">{stats.pendentesHoje}</span> revisões previstas para hoje.
                        </p>

                        {/* Linha 2: Progresso do Dia (O que foi feito) */}
                        {stats.concluidasHoje > 0 && (
                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {stats.concluidasHoje} já foram concluídas hoje.
                            </p>
                        )}

                        {/* Linha 3: Orientação (Capacidade como conforto) */}
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed pt-1 border-t border-emerald-100 dark:border-emerald-900/30">
                            Sua capacidade sustentável é de <span className="font-semibold">{dailyCapacity}</span>.
                            Manter-se próximo a este número favorece o equilíbrio a longo prazo.
                        </p>
                    </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                {/* 3. Simulação — Impacto da Semana (7 dias) (Forecast Informativo) */}
                <TooltipProvider>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Simulação (7 Dias)</span>
                            </div>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[200px]">
                                    <p>Projeção de impacto no backlog para a janela de 7 dias.</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                            Das <span className="font-bold">{stats.totalGeral}</span> revisões do sistema, <span className="font-bold">{stats.impactoSemana}</span> impactam esta semana.
                        </p>

                        {/* Texto Condicional de Forecast */}
                        {stats.ritmoMedio <= dailyCapacity ? (
                            // Cenário Saudável: Linguagem qualitativa/confortável
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                A projeção de carga para a semana é <span className="font-medium text-emerald-600 dark:text-emerald-400">compatível com seu ritmo atual</span>.
                            </p>
                        ) : (
                            // Cenário de Atenção: Mostra número para consciência
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                A projeção indica uma média de <span className="font-bold text-amber-600 dark:text-amber-400">{stats.ritmoMedio}/dia</span> para zerar o backlog na semana.
                            </p>
                        )}

                        {/* Alerta de Sobrecarga Futura (Mantido lógica existente, apenas reposicionado visualmente se necessário) */}
                        {(() => {
                            const ritmoPrevisto = stats.ritmoMedio;
                            const limiteAtencao = dailyCapacity * 1.2;

                            if (ritmoPrevisto <= dailyCapacity) return null;

                            if (ritmoPrevisto > limiteAtencao) {
                                return (
                                    <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 flex gap-2 items-start">
                                        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-amber-800 dark:text-amber-200 leading-relaxed">
                                            O ritmo previsto excede sua capacidade habitual. Considere reduzir novas adições para recuperar o equilíbrio.
                                        </p>
                                    </div>
                                );
                            }

                            return (
                                <p className="text-[10px] text-slate-400 mt-2 italic border-l-2 border-slate-200 dark:border-slate-600 pl-2">
                                    Esta projeção está levemente acima da sua capacidade habitual.
                                </p>
                            );
                        })()}
                    </div>
                </TooltipProvider>

            </div>
        </div>
    );
};
