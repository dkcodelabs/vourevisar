import React, { useState } from 'react';
import { Calendar, Target, Edit3, X, ChevronRight, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useUserSettings } from '@/hooks/useUserSettings';
import { toast } from '@/lib/toast';

export const ExamCountdown = () => {
    const { settings, getExamCountdown, updateExamDate } = useUserSettings();
    const [isEditing, setIsEditing] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    const countdown = getExamCountdown();

    const handleSave = async () => {
        if (!selectedDate) {
            toast.error('Selecione uma data válida');
            return;
        }

        setIsSaving(true);
        const success = await updateExamDate(new Date(selectedDate));
        setIsSaving(false);

        if (success) {
            toast.success('Data da prova definida! 🎯');
            setIsEditing(false);
        } else {
            toast.error('Erro ao salvar. Tente novamente.');
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
                return {
                    bg: 'from-red-500 to-rose-600',
                    text: 'text-red-50',
                    badge: 'bg-red-400/30',
                    progress: 'bg-red-300',
                    glow: 'shadow-red-500/25'
                };
            case 'high':
                return {
                    bg: 'from-amber-500 to-orange-600',
                    text: 'text-amber-50',
                    badge: 'bg-amber-400/30',
                    progress: 'bg-amber-300',
                    glow: 'shadow-amber-500/25'
                };
            case 'medium':
                return {
                    bg: 'from-blue-500 to-indigo-600',
                    text: 'text-blue-50',
                    badge: 'bg-blue-400/30',
                    progress: 'bg-blue-300',
                    glow: 'shadow-blue-500/25'
                };
            default:
                return {
                    bg: 'from-emerald-500 to-teal-600',
                    text: 'text-emerald-50',
                    badge: 'bg-emerald-400/30',
                    progress: 'bg-emerald-300',
                    glow: 'shadow-emerald-500/25'
                };
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
                className="group flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer"
            >
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                    <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="text-left">
                    <span className="block text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                        Definir Meta
                    </span>
                    <span className="text-xs text-indigo-500 dark:text-indigo-400">
                        Quando é sua prova?
                    </span>
                </div>
                <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform ml-auto" />
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
                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-600 to-slate-700 p-5 shadow-lg"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/10 rounded-xl">
                            <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="block text-sm text-white/80">Prova realizada em</span>
                            <span className="font-semibold text-white">{formatDate(countdown.examDate)}</span>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="text-white/80 hover:text-white hover:bg-white/10"
                    >
                        <Edit3 className="w-4 h-4" />
                    </Button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${colors.bg} p-5 shadow-xl ${colors.glow}`}
        >
            {/* Decoração de fundo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 ${colors.badge} rounded-xl backdrop-blur-sm`}>
                            <Target className="w-5 h-5 text-white" />
                        </div>
                        <span className={`text-sm font-medium ${colors.text} opacity-90`}>
                            FALTAM
                        </span>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedDate(settings?.data_prova_meta || '');
                            setIsEditing(true);
                        }}
                        className={`p-2 ${colors.badge} rounded-xl hover:bg-white/20 transition-colors backdrop-blur-sm`}
                    >
                        <Edit3 className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Número grande */}
                <div className="flex items-baseline gap-2 mb-3">
                    <motion.span
                        key={countdown.daysRemaining}
                        initial={{ scale: 1.2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-5xl font-black text-white tracking-tight"
                    >
                        {countdown.daysRemaining}
                    </motion.span>
                    <span className={`text-xl font-semibold ${colors.text} opacity-90`}>
                        {countdown.daysRemaining === 1 ? 'DIA' : 'DIAS'}
                    </span>
                    {countdown.urgency === 'critical' && (
                        <Flame className="w-6 h-6 text-white animate-pulse ml-1" />
                    )}
                </div>

                {/* Barra de progresso */}
                <div className="mb-3">
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${countdown.progressPercentage}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={`h-full ${colors.progress} rounded-full`}
                        />
                    </div>
                </div>

                {/* Data formatada */}
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-white/70" />
                    <span className={`text-sm ${colors.text} opacity-80`}>
                        {formatDate(countdown.examDate)}
                    </span>
                </div>
            </div>
        </motion.div>
    );
};
