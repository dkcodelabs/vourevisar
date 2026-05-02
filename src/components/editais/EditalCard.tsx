import React from 'react';
import { motion } from 'framer-motion';
import {
    Trash2, Play, Eye, CalendarDays, Clock,
    BookOpen, AlertTriangle, CheckCircle2, Timer, GraduationCap, X, Loader2, RefreshCw,
    Edit2, Plus
} from 'lucide-react';
import type { UserEdital } from '@/pages/Editais';

interface EditalCardProps {
    edital: UserEdital;
    metrics: {
        totalTopics: number;
        completedTopics: number;
        totalStudyMinutes: number;
        subjectsCount: number;
        completedSubjectsCount?: number;
    };
    daysLeft: number | null;
    isSelected: boolean;
    onToggleSelect: () => void;
    onViewSubjects: () => void;
    onLoadCycle: () => void;
    onUnloadCycle: () => void;
    onDelete: () => void;
    isProcessing?: boolean;
    processingProgress?: { percentage: number; message: string };
    hasUpdate?: boolean;
    onSync?: () => void;
    onEdit?: () => void;
    isHighlighted?: boolean;
}

export const EditalCard = ({
    edital, metrics, daysLeft, isSelected,
    onToggleSelect, onViewSubjects, onLoadCycle, onUnloadCycle, onDelete,
    isProcessing = false, processingProgress, hasUpdate = false, onSync, onEdit, isHighlighted = false
}: EditalCardProps) => {
    const progress = metrics.totalTopics > 0
        ? Math.round((metrics.completedTopics / metrics.totalTopics) * 100)
        : 0;

    const hours = Math.floor(metrics.totalStudyMinutes / 60);
    const mins = metrics.totalStudyMinutes % 60;
    const studyTimeLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    const getUrgencyColor = () => {
        if (daysLeft === null || daysLeft === undefined || isNaN(daysLeft)) {
            return { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', label: 'Definir data da prova', icon: 'calendar' };
        }
        
        const examDateFormatted = edital.examDate ? new Date(edital.examDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '';
        
        if (daysLeft <= 0) {
            return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: `Prova vencida${examDateFormatted ? ` em ${examDateFormatted}` : ''}`, icon: 'alert' };
        }
        if (daysLeft <= 15) {
            return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', label: `${daysLeft} dias para a prova`, icon: 'alert' };
        }
        if (daysLeft <= 45) {
            return { bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/30', label: `${daysLeft} dias para a prova`, icon: 'alert' };
        }
        return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', label: `${daysLeft} dias para a prova`, icon: 'clock' };
    };

    const urgency = getUrgencyColor();
    const createdDate = new Date(edital.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

    // Procura por Órgão e Cargo estruturados ou faz o split do name como fallback
    const displayOrgan = edital.organ || edital.name.split(' - ')[0];
    const displayPosition = edital.position || (edital.name.split(' - ').length > 1 ? edital.name.split(' - ').slice(1).join(' - ') : null);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="glow-card group relative overflow-hidden bg-card dark:bg-zinc-900/40 border border-border dark:border-white/5 hover:border-border-strong dark:hover:border-white/10 transition-all duration-300 rounded-3xl w-full max-w-[420px] mx-auto xl:mx-0"
        >
            {/* Destaque (Highlight) via Div Absoluta para evitar recortes */}
            {isHighlighted && (
                <div className="absolute inset-0 rounded-[inherit] ring-[3px] ring-primary shadow-[0_0_20px_rgba(14,165,233,0.3)] animate-pulse-subtle pointer-events-none z-50" />
            )}

            {/* Ações Topo Direito */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                {edital.sourceId && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSync?.();
                        }}
                        disabled={isProcessing}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all disabled:opacity-50 ${
                            hasUpdate 
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 animate-pulse border border-emerald-400' 
                                : 'bg-secondary/50 dark:bg-zinc-800/50 border border-border dark:border-white/5 text-content-muted hover:text-emerald-400'
                        }`}
                        title={hasUpdate ? "Atualização disponível!" : "Sincronizar com edital base"}
                    >
                        {isProcessing && edital.sourceId ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <RefreshCw size={16} className={hasUpdate ? "animate-spin-slow" : ""} />
                        )}
                    </button>
                )}
                
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.();
                    }}
                    disabled={isProcessing}
                    className="w-8 h-8 flex items-center justify-center bg-secondary/50 dark:bg-zinc-800/50 border border-border dark:border-white/5 hover:text-primary hover:bg-primary/10 text-content-muted rounded-lg transition-all disabled:opacity-50"
                    title="Editar edital"
                >
                    <Edit2 size={16} />
                </button>

                <button
                    onClick={onDelete}
                    disabled={isProcessing}
                    className="w-8 h-8 flex items-center justify-center bg-secondary/50 dark:bg-zinc-800/50 border border-border dark:border-white/5 hover:bg-red-500/10 text-content-muted hover:text-red-400 rounded-lg transition-all disabled:opacity-50"
                    title="Excluir edital"
                >
                    {isProcessing && !edital.mergedIntoCycle ? (
                        <Loader2 size={16} className="animate-spin text-red-500" />
                    ) : (
                        <Trash2 size={16} />
                    )}
                </button>
            </div>

            <div className="p-4 md:p-5">
                <div className="flex items-start mb-3">
                    <div className="flex-1 min-w-0 pr-32">
                        <div className="flex flex-col min-w-0">
                            <h3 className="text-[15px] font-black text-foreground tracking-tight truncate uppercase flex items-center gap-x-2">
                                <span>{displayOrgan}</span>
                                {edital.year && (
                                    <>
                                        <span className="text-content-muted font-normal">•</span>
                                        <span className="text-foreground">{edital.year}</span>
                                    </>
                                )}
                            </h3>
                            {displayPosition && (
                                <p className="text-[11px] text-content-muted font-bold tracking-tight uppercase truncate">
                                    {displayPosition}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between border-b border-border dark:border-white/5 pb-3 mb-4">
                    <span className="text-[10px] text-content-muted font-medium">{createdDate}</span>
                    {edital.sourceId ? (
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-500">
                            CÓPIA • SISTEMA
                        </span>
                    ) : edital.isImported ? (
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-purple-500">
                            CÓPIA • IA
                        </span>
                    ) : (
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500">
                            MANUAL
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-secondary dark:bg-white/5 rounded-2xl p-3 border border-border dark:border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpen size={12} className="text-content-muted" />
                            <span className="text-[9px] font-bold text-content-muted uppercase tracking-widest">Progresso</span>
                        </div>
                        <div className="flex flex-col gap-1.5 mt-1">
                            {/* Tópicos */}
                            <div className="flex items-center gap-2">
                                <div className="text-base font-bold text-foreground leading-none">
                                    {metrics.completedTopics}<span className="text-[10px] text-content-muted font-bold ml-1 uppercase truncate">/{metrics.totalTopics} tópicos</span>
                                </div>
                            </div>
                            
                            {/* Matérias */}
                            <div className="flex items-center gap-2">
                                <div className="text-base font-bold text-foreground leading-none">
                                    {metrics.completedSubjectsCount || 0}<span className="text-[10px] text-content-muted font-bold ml-1 uppercase truncate">/{metrics.subjectsCount} matérias</span>
                                </div>
                            </div>
                        </div>
                        <div className="w-full h-1 bg-secondary dark:bg-zinc-800 rounded-full mt-2 overflow-hidden border border-border dark:border-white/5">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                    
                    <div className="bg-secondary dark:bg-white/5 rounded-2xl p-3 border border-border dark:border-white/5 flex flex-col items-center justify-center text-center">
                        <span className="text-[9px] font-bold text-content-muted/80 uppercase tracking-widest mb-1">Tempo</span>
                        <div className="text-2xl font-black text-sky-400 leading-none">
                            {studyTimeLabel}
                        </div>
                        <p className="text-[10px] text-content-muted mt-1 font-bold lowercase tracking-tight">
                            tempo de estudo
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 justify-center">
                    {metrics.subjectsCount > 0 ? (
                        <>
                            <button
                                onClick={onViewSubjects}
                                className="flex items-center justify-center gap-2 py-1.5 bg-secondary dark:bg-zinc-800/80 border border-border dark:border-white/5 hover:bg-secondary-strong dark:hover:bg-zinc-700 text-content-muted hover:text-foreground dark:hover:text-content-main rounded-xl transition-all text-xs font-bold"
                            >
                                <Eye size={14} />
                                Ver Matérias
                            </button>
                            <button
                                onClick={edital.mergedIntoCycle ? onUnloadCycle : onLoadCycle}
                                disabled={isProcessing}
                                className={`relative flex items-center justify-center gap-2 py-1.5 rounded-xl transition-all text-xs font-bold shadow-lg overflow-hidden disabled:opacity-80 disabled:cursor-not-allowed ${
                                    edital.mergedIntoCycle
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 shadow-none'
                                        : 'bg-primary hover:bg-primary/90 text-white shadow-primary/20'
                                }`}
                            >
                                {/* Background Fill Animation */}
                                {isProcessing && processingProgress && (
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${processingProgress.percentage}%` }}
                                        className={`absolute inset-y-0 left-0 z-0 opacity-20 ${
                                            edital.mergedIntoCycle ? 'bg-red-500' : 'bg-white'
                                        }`}
                                    />
                                )}

                                <div className="relative z-10 flex items-center justify-center gap-2">
                                    {isProcessing ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            {processingProgress ? `${processingProgress.percentage}%` : ''}
                                        </>
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
                                </div>
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={onViewSubjects}
                                className="flex items-center justify-center gap-2 py-1.5 bg-secondary dark:bg-zinc-800/80 border border-border dark:border-white/5 hover:bg-secondary-strong dark:hover:bg-zinc-700 text-content-muted hover:text-foreground rounded-xl transition-all text-xs font-bold"
                            >
                                <Eye size={14} />
                                Ver
                            </button>

                            <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                                <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                                <span className="text-[11px] font-bold text-amber-400 leading-tight">Sem matérias</span>
                            </div>
                        </>
                    )}
                </div>


                {/* Detalhes do Progresso de Remoção */}
                {isProcessing && processingProgress?.message && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 overflow-hidden px-1"
                    >
                        <p className="text-[10px] text-content-muted font-bold tracking-tight uppercase animate-pulse flex items-center gap-1.5">
                            <RefreshCw size={10} className="animate-spin-slow text-primary/60" />
                            {processingProgress.message}...
                        </p>
                    </motion.div>
                )}

                {!isProcessing && urgency && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit?.();
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl mt-4 border transition-all w-full group/urgency ${urgency.bg} ${urgency.border} hover:opacity-80`}
                    >
                        {urgency.icon === 'calendar' ? (
                            <CalendarDays size={14} className={urgency.text} />
                        ) : urgency.icon === 'clock' ? (
                            <Clock size={14} className={urgency.text} />
                        ) : (
                            <AlertTriangle size={14} className={urgency.text} />
                        )}
                        <span className={`text-xs font-bold ${urgency.text}`}>
                            {urgency.label}
                        </span>
                    </button>
                )}
            </div>
        </motion.div>
    );
};
