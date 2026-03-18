import React, { useState } from 'react';
import { Calendar, Target, Edit3, X, ChevronRight, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useUserSettings } from '@/hooks/useUserSettings';
import { toast } from '@/lib/toast';
import { errorService } from '@/lib/errors/errorService';

interface ExamCountdownProps {
    minimal?: boolean;
    hasActiveEdital?: boolean;
}

export const ExamCountdown = ({ minimal, hasActiveEdital }: ExamCountdownProps) => {
    const { settings, getExamCountdown, updateExamDate } = useUserSettings();
    const [isEditing, setIsEditing] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    const countdown = getExamCountdown();

    const handleSave = async () => {
        if (!selectedDate) {
            errorService.report(new Error('Data não selecionada'), {
                module: 'dashboard',
                action: 'update_exam_date',
                userMessage: 'Selecione uma data válida'
            });
            return;
        }

        setIsSaving(true);
        const success = await updateExamDate(new Date(selectedDate));
        setIsSaving(false);

        if (success) {
            toast.success('Data da prova definida! 🎯');
            setIsEditing(false);
        } else {
            errorService.report(new Error('Falha ao salvar data da prova'), {
                module: 'dashboard',
                action: 'update_exam_date',
                userMessage: 'Erro ao salvar. Tente novamente.'
            });
        }
    };

    const handleRemove = async () => {
        setIsSaving(true);
        const success = await updateExamDate(null);
        setIsSaving(false);

        if (success) {
            toast.success('Data removida');
            setIsEditing(false);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    // Cores baseadas na urgência
    const getUrgencyColors = (urgency: string) => {
        switch (urgency) {
            case 'critical':
                return { text: 'text-red-500', bg: 'bg-red-500/5', bar: 'bg-red-500' };
            case 'high':
                return { text: 'text-orange-500', bg: 'bg-orange-500/5', bar: 'bg-orange-500' };
            case 'medium':
                return { text: 'text-blue-500', bg: 'bg-blue-500/5', bar: 'bg-blue-500' };
            default:
                return { text: 'text-emerald-500', bg: 'bg-emerald-500/5', bar: 'bg-emerald-500' };
        }
    };

    // Modal de edição (sempre o mesmo)
    if (isEditing && hasActiveEdital) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`${minimal ? '' : 'bg-card rounded-2xl border-[color:var(--card-border-color)] shadow-lg'} p-5`}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="font-semibold text-foreground">Data da Prova</h3>
                    </div>
                    <button
                        onClick={() => setIsEditing(false)}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-muted-foreground mb-2">
                            Quando será sua prova?
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        />
                    </div>

                    <div className="flex gap-3">
                        {countdown && (
                            <Button
                                variant="outline"
                                onClick={handleRemove}
                                disabled={isSaving}
                                className="flex-1 text-destructive border-destructive/20 hover:bg-destructive/10"
                            >
                                Remover
                            </Button>
                        )}
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !selectedDate}
                            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                            {isSaving ? 'Salvando...' : 'Definir Meta'}
                        </Button>
                    </div>
                </div>
            </motion.div >
        );
    }

    // Estado sem edital ativo (Onboarding)
    if (!hasActiveEdital) {
        return (
            <div className={`w-full ${minimal ? '' : 'glow-card'} flex flex-col p-6 rounded-3xl relative overflow-hidden text-center justify-center items-center h-full`}>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    <Target className="w-6 h-6 text-primary animate-pulse" />
                </div>
                <h3 className="text-sm font-black text-foreground mb-1 leading-tight">
                    Defina sua meta após iniciar o ciclo! ✨
                </h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 leading-tight">
                    Carregue seu edital para habilitar a contagem regressiva
                </p>
            </div>
        );
    }

    // Estado sem data definida
    if (!countdown) {
        return (
            <motion.button
                onClick={() => setIsEditing(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full ${minimal ? '' : 'glow-card border-dashed'} flex items-center justify-between p-6 rounded-3xl relative overflow-hidden group border hover:border-primary/50 transition-all text-left`}
            >
                <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Data da Prova</span>
                    <span className="text-xl font-black text-foreground">Definir Meta</span>
                    <span className="text-[10px] font-bold text-primary opacity-60 uppercase block mt-1 font-black">Ciclo ativo! Defina sua data se desejar 🎯</span>
                </div>
                <Target className="w-6 h-6 text-primary/50 group-hover:text-primary transition-colors" />
            </motion.button>
        );
    }

    // Estado com contagem regressiva
    const colors = getUrgencyColors(countdown.urgency);
    const isPast = countdown.isPast;

    if (isPast) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${minimal ? '' : 'glow-card p-5'} rounded-3xl flex flex-col h-full relative overflow-hidden group`}
            >
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Data da Prova</span>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                        <Edit3 className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex flex-col gap-1 relative z-10 flex-1 justify-end">
                    <h4 className="text-xl font-black text-foreground">
                        Realizada
                    </h4>
                    <p className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase mt-1">
                        Concluída em {formatDate(countdown.examDate)}
                    </p>
                </div>
            </motion.div>
        );
    }

    if (minimal) {
        return (
            <div className="flex flex-col h-full justify-center">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Contagem Regressiva</span>
                        <button
                            onClick={() => {
                                setSelectedDate(settings?.data_prova_meta || '');
                                setIsEditing(true);
                            }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Edit3 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-end gap-2">
                        <span className="text-5xl font-black text-foreground tracking-tighter shadow-sm leading-none">
                            {countdown.daysRemaining}
                        </span>
                        <div className="flex flex-col mb-1.5">
                            <span className="text-[10px] font-black text-primary uppercase leading-tight">Dias</span>
                            <span className="text-[10px] font-black text-muted-foreground uppercase leading-none">Restantes</span>
                        </div>
                        {countdown.urgency === 'critical' && (
                            <Flame className={`w-6 h-6 ${colors.text} animate-bounce ml-auto`} />
                        )}
                    </div>

                    <div className="mt-4 space-y-2">
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${countdown.progressPercentage}%` }}
                                transition={{ duration: 1.5, ease: 'circOut' }}
                                className={`h-full ${colors.bar} rounded-full`}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-[10px] font-bold text-foreground/70 uppercase">
                                {formatDate(countdown.examDate)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glow-card p-5 rounded-3xl flex flex-col h-full relative overflow-hidden group"
        >
            <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Data da Prova</span>
                <button
                    onClick={() => {
                        setSelectedDate(settings?.data_prova_meta || '');
                        setIsEditing(true);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                    <Edit3 className="w-5 h-5" />
                </button>
            </div>

            <div className="flex flex-col gap-1 relative z-10 flex-1 justify-end">
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-foreground tracking-tight">
                        {countdown.daysRemaining}
                    </span>
                    <span className={`text-[13px] font-bold text-orange-600 dark:text-orange-500 uppercase`}>
                        {countdown.daysRemaining === 1 ? 'DIA RESTANTE' : 'DIAS RESTANTES'}
                    </span>
                    {countdown.urgency === 'critical' && (
                        <Flame className={`w-5 h-5 ${colors.text} animate-pulse ml-1`} />
                    )}
                </div>

                <div className="mt-4 mb-2">
                    <div className="h-1.5 w-full bg-secondary dark:bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${countdown.progressPercentage}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={`h-full bg-orange-500 rounded-full`}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                    <Calendar className="w-4 h-4 text-slate-400 dark:text-white/80" />
                    <span className="text-[11px] font-bold text-foreground uppercase">
                        {formatDate(countdown.examDate)}
                    </span>
                </div>
            </div>
        </motion.div>
    );
};
