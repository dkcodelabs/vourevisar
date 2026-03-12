import React from 'react';
import { motion } from 'framer-motion';
import {
    Trash2, Play, Eye, CalendarDays, Clock,
    BookOpen, AlertTriangle, CheckCircle2, Timer, GraduationCap, X, Loader2
} from 'lucide-react';
import type { UserEdital } from '@/pages/Editais';

interface EditalCardProps {
    edital: UserEdital;
    metrics: {
        totalTopics: number;
        completedTopics: number;
        totalStudyMinutes: number;
        subjectsCount: number;
    };
    daysLeft: number | null;
    isSelected: boolean;
    onToggleSelect: () => void;
    onViewSubjects: () => void;
    onLoadCycle: () => void;
    onUnloadCycle: () => void;
    onDelete: () => void;
    isProcessing?: boolean;
}

export const EditalCard = ({
    edital, metrics, daysLeft, isSelected,
    onToggleSelect, onViewSubjects, onLoadCycle, onUnloadCycle, onDelete,
    isProcessing = false
}: EditalCardProps) => {
    const progress = metrics.totalTopics > 0
        ? Math.round((metrics.completedTopics / metrics.totalTopics) * 100)
        : 0;

    const hours = Math.floor(metrics.totalStudyMinutes / 60);
    const mins = metrics.totalStudyMinutes % 60;
    const studyTimeLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    const getUrgencyColor = () => {
        if (daysLeft === null) return null;
        if (daysLeft <= 0) return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', label: 'Prova vencida' };
        if (daysLeft <= 7) return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', label: `${daysLeft}d` };
        if (daysLeft <= 30) return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', label: `${daysLeft}d` };
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: `${daysLeft}d` };
    };

    const urgency = getUrgencyColor();
    const createdDate = new Date(edital.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

    // Tenta separar Órgão e Cargo se houver " - "
    const nameParts = edital.name.split(' - ');
    const organ = nameParts[0];
    const position = nameParts.length > 1 ? nameParts.slice(1).join(' - ') : null;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`glow-card group relative overflow-hidden bg-zinc-900/40 border border-white/5 hover:border-white/10 transition-all duration-300 rounded-3xl ${
                isSelected ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-950 border-violet-500' : ''
            }`}
        >
            <button
                onClick={onToggleSelect}
                className={`absolute top-4 right-4 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all z-10 ${
                    isSelected
                        ? 'bg-violet-500 border-violet-500 text-white'
                        : 'border-white/20 hover:border-white/40 text-transparent hover:text-white/20'
                }`}
            >
                {isSelected && <CheckCircle2 size={14} />}
            </button>

            <div className="p-5 md:p-6">
                <div className="flex items-start gap-4 mb-5">
                    <div className="w-11 h-11 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                        <GraduationCap className="text-primary" size={22} />
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                        <h3 className="text-base font-semibold text-foreground tracking-tight truncate">
                            {edital.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${
                                edital.isImported ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                                {edital.isImported ? 'Importado' : 'Manual'}
                            </span>
                            <span className="text-[10px] text-content-muted">•</span>
                            <span className="text-[10px] text-content-muted font-medium">{createdDate}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-black/20 dark:bg-white/5 rounded-2xl p-3.5 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpen size={14} className="text-content-muted" />
                            <span className="text-[10px] font-bold text-content-muted uppercase tracking-widest">Progresso</span>
                        </div>
                        <div className="text-lg font-semibold text-foreground leading-none">
                            {metrics.completedTopics}<span className="text-sm text-content-muted font-medium ml-1">/{metrics.totalTopics}</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-2 overflow-hidden border border-white/5">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    <div className="bg-black/20 dark:bg-white/5 rounded-2xl p-3.5 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <Timer size={14} className="text-content-muted" />
                            <span className="text-[10px] font-bold text-content-muted uppercase tracking-widest">Tempo</span>
                        </div>
                        <div className="text-lg font-semibold text-foreground leading-none">
                            {studyTimeLabel}
                        </div>
                        <p className="text-[10px] text-content-muted mt-1 font-medium">
                            {metrics.subjectsCount} matéria{metrics.subjectsCount !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                {metrics.subjectsCount === 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-5 bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                        <span className="text-xs font-bold text-amber-400">Edital sem matérias</span>
                        <span className="text-[10px] text-amber-300/70 ml-1">— pode ser excluído</span>
                    </div>
                )}

                {urgency && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-5 border ${urgency.bg} ${urgency.border}`}>
                        <AlertTriangle size={14} className={urgency.text} />
                        <span className={`text-xs font-semibold ${urgency.text}`}>
                            {daysLeft !== null && daysLeft > 0 ? `${daysLeft} dias para a prova` : urgency.label}
                        </span>
                    </div>
                )}

                <div className="flex items-center gap-2 mt-auto">
                    <button
                        onClick={onViewSubjects}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-800 border border-white/5 hover:bg-zinc-700 text-content-muted hover:text-content-main rounded-xl transition-all text-xs font-bold"
                    >
                        <Eye size={14} />
                        Ver Matérias
                    </button>
                    {metrics.subjectsCount > 0 && (
                        <button
                            onClick={edital.mergedIntoCycle ? onUnloadCycle : onLoadCycle}
                            disabled={isProcessing}
                            className={`flex-[1.5] flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all text-xs font-bold shadow-lg disabled:opacity-60 disabled:cursor-not-allowed ${
                                edital.mergedIntoCycle
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 shadow-none'
                                    : 'bg-primary hover:bg-primary/90 text-white shadow-primary/20'
                            }`}
                        >
                            {isProcessing ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : edital.mergedIntoCycle ? (
                                <>
                                    <X size={14} />
                                    Remover
                                </>
                            ) : (
                                <>
                                    <Play size={14} />
                                    Carregar Ciclo
                                </>
                            )}
                        </button>
                    )}
                    <button
                        onClick={onDelete}
                        className="w-[38px] h-[36px] flex items-center justify-center bg-zinc-800 border border-white/5 hover:bg-red-500/10 text-content-muted hover:text-red-400 rounded-xl transition-all shrink-0 ml-1"
                        title="Excluir edital"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};
