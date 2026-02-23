import React, { useState } from 'react';
import { Calendar, Target, Edit3, X, ChevronRight, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useUserSettings } from '@/hooks/useUserSettings';
import { toast } from '@/lib/toast';
import { errorService } from '@/lib/errors/errorService';

export const ExamCountdown = () => {
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

    // Modal de edição
    if (isEditing) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg p-5"
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                            <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="font-semibold text-slate-800 dark:text-white">Data da Prova</h3>
                    </div>
                    <button
                        onClick={() => setIsEditing(false)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                            Quando será sua prova?
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                    </div>

                    <div className="flex gap-3">
                        {countdown && (
                            <Button
                                variant="outline"
                                onClick={handleRemove}
                                disabled={isSaving}
                                className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                            >
                                Remover
                            </Button>
                        )}
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !selectedDate}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {isSaving ? 'Salvando...' : 'Definir Meta'}
                        </Button>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Estado sem data definida
    if (!countdown) {
        return (
            <motion.button
                onClick={() => setIsEditing(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full glow-card flex items-center justify-between p-6 rounded-3xl relative overflow-hidden group border border-dashed hover:border-primary/50 transition-all text-left"
            >
                <div>
                    <span className="data-label block mb-1">Data da Prova</span>
                    <span className="text-2xl font-black text-foreground">Definir Meta</span>
                    <span className="text-[10px] font-bold text-primary opacity-60 uppercase block mt-1">Quando é sua prova?</span>
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
                className="glow-card p-6 rounded-3xl flex flex-col h-full relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:opacity-100 transition-opacity"></div>

                <div className="flex items-center justify-between mb-6 relative z-10">
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Data da Prova</span>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-1"
                    >
                        <Edit3 className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-col gap-1 relative z-10">
                    <h4 className="text-2xl font-black text-foreground">
                        Realizada
                    </h4>
                    <div className="flex flex-col gap-1 mt-1">
                        <p className="text-[10px] font-bold text-slate-500 opacity-60 uppercase">
                            Concluída em {formatDate(countdown.examDate)}
                        </p>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glow-card p-8 rounded-3xl flex flex-col h-full relative overflow-hidden group"
        >
            <div className={`absolute top-0 right-0 w-32 h-32 ${colors.bg} rounded-full -mr-16 -mt-16 blur-2xl group-hover:opacity-100 transition-opacity`}></div>

            <div className="flex items-center justify-between mb-10 relative z-10">
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Data da Prova</span>
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
                    <span className="text-6xl font-black text-[#1a2332] dark:text-white tracking-tight">
                        {countdown.daysRemaining}
                    </span>
                    <span className={`text-[13px] font-bold text-orange-600 dark:text-orange-500 uppercase`}>
                        {countdown.daysRemaining === 1 ? 'DIA RESTANTE' : 'DIAS RESTANTES'}
                    </span>
                    {countdown.urgency === 'critical' && (
                        <Flame className={`w-5 h-5 ${colors.text} animate-pulse ml-1`} />
                    )}
                </div>

                {/* Barra de progresso */}
                <div className="mt-8 mb-4">
                    <div className="h-2 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${countdown.progressPercentage}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={`h-full bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]`}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                    <Calendar className="w-4 h-4 text-slate-400 dark:text-white/80" />
                    <span className="text-[13px] font-bold text-[#1a2332] dark:text-white/90 uppercase">
                        {formatDate(countdown.examDate)}
                    </span>
                </div>
            </div>
        </motion.div>
    );
};
