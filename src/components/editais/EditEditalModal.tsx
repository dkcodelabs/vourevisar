import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Building2, Briefcase, CalendarDays, Loader2 } from 'lucide-react';
import { UserEdital } from '@/pages/Editais';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';

interface EditEditalModalProps {
    isOpen: boolean;
    onClose: () => void;
    edital: UserEdital | null;
    onSave: (id: string, updates: { organ: string; position: string; year: string; exam_date?: string }) => Promise<void>;
}

export const EditEditalModal = ({ isOpen, onClose, edital, onSave }: EditEditalModalProps) => {
    const [organ, setOrgan] = useState('');
    const [position, setPosition] = useState('');
    const [year, setYear] = useState('');
    const [examDate, setExamDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (edital && isOpen) {
            setOrgan(edital.organ || edital.name.split(' - ')[0] || '');
            setPosition(edital.position || (edital.name.split(' - ').length > 1 ? edital.name.split(' - ').slice(1).join(' - ') : ''));
            setYear(edital.year || '');
            setExamDate(edital.examDate || '');
        }
    }, [edital, isOpen]);

    const handleSave = async () => {
        if (!edital) return;
        if (!organ.trim()) {
            toastGate.notifyError('O Órgão/Concurso é obrigatório.', 'VAL-001');
            return;
        }

        setIsSaving(true);
        try {
            await onSave(edital.id, { 
                organ: organ.trim(), 
                position: position.trim(), 
                year: year.trim(),
                exam_date: examDate.trim() || undefined
            });
            onClose();
        } catch (err) {
            console.error('Erro ao salvar edital:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-[200] p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg bg-white dark:bg-[#18181A] border border-zinc-200 dark:border-white/[0.08] rounded-[32px] overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between bg-zinc-50 dark:bg-[#18181A]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                                    <Building2 className="text-primary" size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">Editar Edital</h2>
                                    <p className="text-sm text-zinc-400">Atualize as informações do concurso</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-6">
                            {/* Órgão */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">
                                    Órgão / Concurso
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors">
                                        <Building2 size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        value={organ}
                                        onChange={(e) => setOrgan(e.target.value)}
                                        placeholder="Ex: PMES, PCES, INSS..."
                                        className="w-full h-14 bg-zinc-950/50 border border-white/5 rounded-2xl pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Cargo */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">
                                    Cargo / Especialidade
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors">
                                        <Briefcase size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        value={position}
                                        onChange={(e) => setPosition(e.target.value)}
                                        placeholder="Ex: Soldado Combatente, Agente..."
                                        className="w-full h-14 bg-zinc-950/50 border border-white/5 rounded-2xl pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Ano */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">
                                    Ano do Edital
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors">
                                        <CalendarDays size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        value={year}
                                        onChange={(e) => setYear(e.target.value)}
                                        placeholder="Ex: 2024"
                                        className="w-full h-14 bg-zinc-950/50 border border-white/5 rounded-2xl pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Data da Prova */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">
                                    Data da Prova
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors">
                                        <CalendarDays size={18} />
                                    </div>
                                    <input
                                        type="date"
                                        value={examDate}
                                        onChange={(e) => setExamDate(e.target.value)}
                                        className="w-full h-14 bg-zinc-950/50 border border-white/5 rounded-2xl pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-zinc-950/50 border-t border-white/5 flex items-center justify-end gap-4">
                            <button
                                onClick={onClose}
                                className="px-6 h-12 rounded-2xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-8 h-12 bg-primary hover:bg-primary-hover text-white rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Save size={18} />
                                )}
                                Salvar Alterações
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
