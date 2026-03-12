import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Search, RotateCcw, PenLine, X } from 'lucide-react';
import { Subject } from '@/types';

// Mock types locally adapted
export type Suggestion = {
    subjectIds: string[];
    suggestedName: string;
    approved: boolean;
};

interface SmartMergeModalProps {
    isOpen: boolean;
    onClose: () => void;
    subjects: Subject[];
    suggestions: Suggestion[];
    onApply: (approvedSuggestions: Suggestion[]) => void;
}


export const SmartMergeModal = ({ isOpen, onClose, subjects, suggestions, onApply }: SmartMergeModalProps) => {
    const [localSuggestions, setLocalSuggestions] = useState<Suggestion[]>(suggestions);

    React.useEffect(() => {
        setLocalSuggestions(suggestions);
    }, [suggestions]);

    if (!isOpen) return null;

    const toggleApproval = (idx: number) => {
        const newSuggestions = [...localSuggestions];
        newSuggestions[idx].approved = !newSuggestions[idx].approved;
        setLocalSuggestions(newSuggestions);
    };

    const updateName = (idx: number, newName: string) => {
        const newSuggestions = [...localSuggestions];
        newSuggestions[idx].suggestedName = newName;
        setLocalSuggestions(newSuggestions);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-2xl bg-zinc-900 border border-black/10 dark:border-white/10 rounded-[32px] p-8 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-black text-content-main tracking-tight flex items-center gap-2">
                            <Sparkles className="text-primary" size={20} />
                            Sugestões Inteligentes de Mescla
                        </h3>
                        <p className="text-xs text-content-muted mt-1">A IA identificou matérias duplicadas ou similares.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                        <X size={20} className="text-content-muted" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-8 custom-scrollbar">
                    {localSuggestions.length === 0 ? (
                        <div className="py-12 text-center">
                            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search size={24} className="text-content-muted" />
                            </div>
                            <p className="text-sm font-bold text-content-muted uppercase tracking-widest">Nenhuma sugestão encontrada</p>
                        </div>
                    ) : (
                        localSuggestions.map((suggestion, idx) => {
                            const subjectsToMerge = subjects.filter(s => suggestion.subjectIds.includes(s.id));
                            const mockSubjectsToMerge = subjectsToMerge.length > 0 ? subjectsToMerge : [
                                { id: 'mock-1', name: 'Português', status: 'Nova' as const, topics: [] },
                                { id: 'mock-2', name: 'Gramática', status: 'Nova' as const, topics: [] }
                            ];

                            return (
                                <div
                                    key={idx}
                                    className={`p-5 rounded-2xl border transition-all ${suggestion.approved ? 'bg-primary/5 border-primary/30' : 'bg-zinc-800 border-black/5 dark:border-white/5 opacity-60'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 text-primary mb-2">
                                                <RotateCcw size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Unir Matérias:</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {mockSubjectsToMerge.map((s) => (
                                                    <span key={s.id} className="px-2 py-1 bg-zinc-800 rounded-lg text-[10px] font-bold text-content-main border border-black/5 dark:border-white/5">
                                                        {s.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleApproval(idx)}
                                            className={`shrink-0 w-12 h-6 rounded-full relative transition-all ${suggestion.approved ? 'bg-primary' : 'bg-zinc-400 dark:bg-zinc-700'
                                                }`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${suggestion.approved ? 'left-7' : 'left-1'
                                                }`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-2 shrink-0">
                                            <PenLine size={14} className="text-content-muted" />
                                            <span className="text-[10px] font-bold text-content-muted uppercase tracking-widest">Nome Final:</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={suggestion.suggestedName}
                                            onChange={(e) => updateName(idx, e.target.value)}
                                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-content-main p-0 outline-none"
                                        />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-zinc-800 text-content-muted font-black rounded-2xl hover:bg-zinc-700 transition-all uppercase text-xs tracking-widest"
                    >
                        CANCELAR
                    </button>
                    <button
                        disabled={!localSuggestions.some(s => s.approved)}
                        onClick={() => onApply(localSuggestions.filter(s => s.approved))}
                        className="flex-1 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary/90 transition-all uppercase text-xs tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        APLICAR MESCLAS APROVADAS
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
