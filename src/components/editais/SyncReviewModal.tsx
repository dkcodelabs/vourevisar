import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle, Plus, Trash2, RefreshCw } from 'lucide-react';
import { Subject, Topic } from '@/types';
import { toast } from '@/lib/toast';
import { errorService } from '@/lib/errors/errorService';

interface SyncReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (selectedAddedSubjects: Subject[], selectedAddedTopics: Record<string, string[]>, removedSubjectIds: string[], removedTopicIds: string[]) => Promise<void>;
    localSubjects: Subject[];
    sourceSubjects: Subject[];
    editalName: string;
}

export const SyncReviewModal: React.FC<SyncReviewModalProps> = ({
    isOpen,
    onClose,
    onApply,
    localSubjects,
    sourceSubjects,
    editalName
}) => {
    const [isApplying, setIsApplying] = useState(false);

    // ── Lógica de Diferenciação ──
    const diff = React.useMemo(() => {
        const additions: { subjects: Subject[], topics: Record<string, string[]> } = { subjects: [], topics: {} };
        const removals: { subjects: Subject[], topics: Record<string, Topic[]> } = { subjects: [], topics: {} };

        if (!sourceSubjects || !Array.isArray(sourceSubjects)) return { additions, removals };

        // 1. Detectar Inclusões (Admin adicionou no oficial)
        sourceSubjects.forEach(ss => {
            const ssName = (ss.name || (ss.name || '')).trim().toUpperCase();
            if (!ssName) return;

            const local = localSubjects.find(ls => (ls.name || '').trim().toUpperCase() === ssName);

            if (!local) {
                additions.subjects.push(ss);
            } else {
                // Matéria existe, ver tópicos
                const newTopics = (ss.topics || []).filter((st: Topic | string) => {
                    const stName = (typeof st === 'string' ? st : st.name || '').trim().toUpperCase();
                    if (!stName) return false;
                    return !local.topics?.some(lt => (lt.name || '').trim().toUpperCase() === stName);
                });
                if (newTopics.length > 0) {
                    additions.topics[local.id] = newTopics.map(t => typeof t === 'string' ? t : t.name);
                }
            }
        });

        // 2. Detectar Remoções (Admin removeu do oficial)
        localSubjects.forEach(ls => {
            const lsName = (ls.name || '').trim().toUpperCase();
            if (!lsName) return;

            const inSource = sourceSubjects.some(ss => (ss.name || '').trim().toUpperCase() === lsName);
            if (!inSource) {
                removals.subjects.push(ls);
            } else {
                const ss = sourceSubjects.find(ss => (ss.name || '').trim().toUpperCase() === lsName);
                if (!ss) return;
                const removedTopics = (ls.topics || []).filter(lt => {
                    const ltName = (lt.name || '').trim().toUpperCase();
                    if (!ltName) return false;

                    const stillInSource = (ss.topics || []).some((st: Topic | string) => 
                        (typeof st === 'string' ? st : st.name || '').trim().toUpperCase() === ltName
                    );
                    return !stillInSource;
                });
                if (removedTopics.length > 0) {
                    removals.topics[ls.id] = removedTopics;
                }
            }
        });

        console.log('Sync Diff Results:', { 
            additionsCount: additions.subjects.length + Object.keys(additions.topics).length,
            removalsCount: removals.subjects.length + Object.keys(removals.topics).length,
            details: { additions, removals }
        });

        return { additions, removals };
    }, [localSubjects, sourceSubjects]);

    // ── Estados de Seleção ──
    const [selectedAdditions, setSelectedAdditions] = useState<Set<string>>(new Set());
    const [selectedRemovals, setSelectedRemovals] = useState<Set<string>>(new Set());

    // Inicializar seleções (Inclusões marcadas por padrão, remoções desmarcadas)
    React.useEffect(() => {
        if (isOpen) {
            const initialAdd = new Set<string>();
            diff.additions.subjects.forEach(s => {
                const sId = s.id || s.name;
                initialAdd.add(`subj-${sId}`);
                if (s.topics) {
                    s.topics.forEach((_, i) => initialAdd.add(`subj-${sId}-t-${i}`));
                }
            });
            Object.entries(diff.additions.topics).forEach(([sId, topics]) => {
                topics.forEach((t, i) => initialAdd.add(`top-${sId}-${i}`));
            });
            setSelectedAdditions(initialAdd);
            setSelectedRemovals(new Set()); // Remoções vazias por padrão
        }
    }, [isOpen, diff]);

    const handleToggleAddition = (id: string) => {
        setSelectedAdditions(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleToggleRemoval = (id: string) => {
        setSelectedRemovals(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleConfirm = async () => {
        setIsApplying(true);
        try {
            // Preparar dados selecionados para o onApply
            const finalAddedSubjects = diff.additions.subjects
                .filter(s => selectedAdditions.has(`subj-${s.id || s.name}`))
                .map(s => {
                    const sId = s.id || s.name;
                    // Filtrar tópicos que puderem ter sido desmarcados individualmente
                    if (s.topics && s.topics.length > 0) {
                        return {
                            ...s,
                            topics: s.topics.filter((_, i) => selectedAdditions.has(`subj-${sId}-t-${i}`))
                        };
                    }
                    return s;
                });

            const finalAddedTopics: Record<string, string[]> = {};
            Object.entries(diff.additions.topics).forEach(([sId, topics]) => {
                const filtered = topics.filter((_, i) => selectedAdditions.has(`top-${sId}-${i}`));
                if (filtered.length > 0) finalAddedTopics[sId] = filtered;
            });

            const finalRemovedSubjIds = diff.removals.subjects.filter(s => selectedRemovals.has(`rem-subj-${s.id}`)).map(s => s.id);
            const finalRemovedTopIds: string[] = [];
            Object.entries(diff.removals.topics).forEach(([sId, topics]) => {
                topics.forEach((t, i) => {
                    if (selectedRemovals.has(`rem-top-${sId}-${t.id}`)) {
                        finalRemovedTopIds.push(t.id);
                    }
                });
            });

            await onApply(finalAddedSubjects, finalAddedTopics, finalRemovedSubjIds, finalRemovedTopIds);
            onClose();
            toast.success('Edital sincronizado com sucesso!');
        } catch (err) {
            errorService.report(err, { module: 'editais', action: 'sync-apply', userMessage: 'Erro ao aplicar atualizações.' });
        } finally {
            setIsApplying(false);
        }
    };

    if (!isOpen) return null;

    const hasChanges = diff.additions.subjects.length > 0 || 
                      Object.keys(diff.additions.topics).length > 0 ||
                      diff.removals.subjects.length > 0 ||
                      Object.keys(diff.removals.topics).length > 0;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xl"
                />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 30 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-lg bg-zinc-900/70 border border-white/10 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-2xl"
                >
                    {/* Header with Glass Effect */}
                    <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                                <RefreshCw className="text-primary animate-[spin_4s_linear_infinite]" size={20} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white tracking-tight">Revisar Atualizações</h2>
                                <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider opacity-70">{editalName}</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-transparent hover:border-white/10"
                        >
                            <X size={20} className="text-zinc-400 hover:text-white transition-colors" />
                        </button>
                    </div>

                    {/* Content Area with Custom Scrollbar */}
                    <div className="p-5 overflow-y-auto custom-scrollbar space-y-8 min-h-[300px]">
                        {!hasChanges ? (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-16"
                            >
                                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
                                    <Check className="text-emerald-500" size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">Tudo em dia!</h3>
                                <p className="text-sm text-zinc-500 max-w-[240px] mx-auto leading-relaxed">Seu edital já está totalmente sincronizado conforme a última atualização oficial.</p>
                            </motion.div>
                        ) : (
                            <div className="space-y-12 pb-4">
                                {/* Section: Inclusões */}
                                {(diff.additions.subjects.length > 0 || Object.keys(diff.additions.topics).length > 0) && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between px-1">
                                            <h3 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                                Novas Inclusões (Adicionar ao Ciclo)
                                            </h3>
                                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 font-bold">
                                                {diff.additions.subjects.length + Object.values(diff.additions.topics).flat().length} itens
                                            </span>
                                        </div>
                                        
                                        <div className="space-y-8">
                                            {/* Novas Matérias */}
                                            {diff.additions.subjects.map((s, i) => {
                                                const sName = s.name;
                                                const isSelected = selectedAdditions.has(`subj-${s.id || s.name}`);
                                                return (
                                                    <motion.div 
                                                        key={`add-s-group-${i}`}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        className="space-y-2"
                                                    >
                                                        {/* Matéria Toggle Card - Unified Identity */}
                                                        <button
                                                            onClick={() => handleToggleAddition(`subj-${s.id || s.name}`)}
                                                            className={`w-full group relative flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 ${
                                                                isSelected
                                                                ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_4px_12px_rgba(16,185,129,0.1)]'
                                                                : 'bg-zinc-800/30 border-white/5 hover:border-white/10'
                                                            }`}
                                                        >
                                                            {/* Sidebar Indicator Integrated */}
                                                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2/3 rounded-r-full transition-all duration-300 ${isSelected ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`} />

                                                            <div className={`ml-2 w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all duration-300 ${
                                                                isSelected
                                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                                : 'border-white/10 text-transparent'
                                                            }`}>
                                                                <Check size={12} strokeWidth={3} />
                                                            </div>
                                                            <div className="flex-1 text-left min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-black text-white uppercase tracking-tight truncate">{sName}</span>
                                                                    <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-widest px-1.5 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20 shrink-0">Novo</span>
                                                                </div>
                                                                <span className="text-[10px] text-zinc-500 font-medium">Adicionar matéria e todos os tópicos</span>
                                                            </div>
                                                        </button>

                                                        {/* Tópicos aninhados */}
                                                        {s.topics && s.topics.length > 0 && (
                                                            <div className="ml-5 border-l border-white/10 pl-5 grid gap-2 py-1">
                                                                {s.topics.map((t, idx) => {
                                                                    const tSelected = selectedAdditions.has(`subj-${s.id || s.name}-t-${idx}`);
                                                                    return (
                                                                        <button
                                                                            key={`add-s-${i}-t-${idx}`}
                                                                            onClick={() => handleToggleAddition(`subj-${s.id || s.name}-t-${idx}`)}
                                                                            className={`relative flex items-center gap-2.5 p-2 rounded-xl border transition-all duration-200 text-left ${
                                                                                tSelected
                                                                                ? 'bg-emerald-500/5 border-emerald-500/10'
                                                                                : 'bg-white/5 border-transparent hover:border-white/10'
                                                                            }`}
                                                                        >
                                                                            <div className="absolute -left-5 top-1/2 w-3 h-px bg-white/10" />
                                                                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all duration-300 ${
                                                                                tSelected
                                                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                                                : 'border-white/10 text-transparent'
                                                                            }`}>
                                                                                <Check size={9} strokeWidth={4} />
                                                                            </div>
                                                                            <span className="text-[11px] font-medium text-zinc-300 truncate flex-1">
                                                                                {typeof t === 'string' ? t : t.name}
                                                                            </span>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                );
                                            })}

                                            {/* Novos Tópicos em Matérias Existentes */}
                                            {Object.entries(diff.additions.topics).map(([sId, topics], sIter) => {
                                                const subj = localSubjects.find(ls => ls.id === sId);
                                                return (
                                                    <div key={`add-t-group-${sId}`} className="space-y-2">
                                                        <div className="flex items-center gap-2 px-1 opacity-70">
                                                            <div className="w-0.5 h-3 bg-primary/50 rounded-full" />
                                                            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{subj?.name}</span>
                                                        </div>
                                                        <div className="ml-2 pl-3 grid gap-2">
                                                            {topics.map((t, i) => {
                                                                const isSelected = selectedAdditions.has(`top-${sId}-${i}`);
                                                                return (
                                                                    <button
                                                                        key={`add-t-${sId}-${i}`}
                                                                        onClick={() => handleToggleAddition(`top-${sId}-${i}`)}
                                                                        className={`relative flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-300 text-left ${
                                                                            isSelected
                                                                            ? 'bg-emerald-500/10 border-emerald-500/30'
                                                                            : 'bg-zinc-800/30 border-white/5 hover:border-white/10'
                                                                        }`}
                                                                    >
                                                                        <div className={`w-4 h-4 rounded-md flex items-center justify-center border-2 transition-all duration-300 shrink-0 ${
                                                                            isSelected
                                                                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                                                            : 'border-white/10 text-transparent'
                                                                        }`}>
                                                                            <Check size={10} strokeWidth={4} />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <span className="text-xs font-bold text-white block truncate">{t}</span>
                                                                            <span className="text-[8px] text-emerald-400/80 font-bold uppercase tracking-widest">Adicionar Tópico</span>
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Section: Remoções */}
                                {(diff.removals.subjects.length > 0 || Object.keys(diff.removals.topics).length > 0) && (
                                    <div className="space-y-6 pt-4 border-t border-white/5">
                                        <div className="flex items-center justify-between px-1">
                                            <h3 className="text-[11px] font-black text-rose-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                                                Removidos do Edital
                                            </h3>
                                            <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-full border border-rose-500/20 font-bold">
                                                {diff.removals.subjects.length + Object.values(diff.removals.topics).flat().length} itens
                                            </span>
                                        </div>
                                        
                                        <div className="space-y-8">
                                            {diff.removals.subjects.map((s, i) => {
                                                const hasProgress = s.topics.some(t => t.completed || t.review_count > 0);
                                                const isSelected = selectedRemovals.has(`rem-subj-${s.id}`);
                                                return (
                                                    <div key={`rem-s-group-${s.id}`} className="space-y-2">
                                                        {/* Matéria Toggle Card - Unified Removal */}
                                                        <button
                                                            onClick={() => handleToggleRemoval(`rem-subj-${s.id}`)}
                                                            className={`w-full group relative flex items-start gap-4 p-3 rounded-2xl border transition-all duration-300 text-left ${
                                                                isSelected
                                                                ? 'bg-rose-500/10 border-rose-500/40 shadow-[0_4px_12px_rgba(244,63,94,0.1)]'
                                                                : 'bg-zinc-800/20 border-white/5 hover:border-white/10'
                                                            }`}
                                                        >
                                                            {/* Sidebar Indicator Integrated */}
                                                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2/3 rounded-r-full transition-all duration-300 ${isSelected ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-zinc-700'}`} />

                                                            <div className={`mt-0.5 ml-2 w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all duration-300 shrink-0 ${
                                                                isSelected
                                                                ? 'bg-rose-500 border-rose-500 text-white'
                                                                : 'border-white/10 text-transparent'
                                                            }`}>
                                                                <Check size={12} strokeWidth={3} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-sm font-black text-rose-100 uppercase tracking-tight truncate ${isSelected ? 'line-through decoration-rose-500/50' : ''}`}>{s.name}</span>
                                                                    <span className="text-[8px] text-rose-400 font-bold uppercase tracking-widest px-1.5 py-0.5 bg-rose-500/10 rounded-md border border-rose-500/20 shrink-0">Remover</span>
                                                                </div>
                                                                <span className="text-[10px] text-zinc-500 font-medium">Parar de estudar esta matéria</span>
                                                                
                                                                {hasProgress && (
                                                                    <div className="mt-2 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg w-fit">
                                                                        <AlertCircle size={10} className="text-amber-500 shrink-0" />
                                                                        <span className="text-[8px] text-amber-500 font-black uppercase tracking-wider">Histórico será mantido</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </button>
                                                    </div>
                                                );
                                            })}

                                            {Object.entries(diff.removals.topics).map(([sId, topics]) => {
                                                const subj = localSubjects.find(ls => ls.id === sId);
                                                return (
                                                    <div key={`rem-t-group-${sId}`} className="space-y-2 pt-2">
                                                        <div className="flex items-center gap-2 px-1 opacity-70">
                                                            <div className="w-0.5 h-3 bg-zinc-600 rounded-full" />
                                                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{subj?.name}</span>
                                                        </div>
                                                        <div className="ml-2 pl-3 grid gap-2">
                                                            {topics.map((t, i) => {
                                                                const isSelected = selectedRemovals.has(`rem-top-${sId}-${t.id}`);
                                                                const studied = t.completed || t.review_count > 0;
                                                                return (
                                                                    <button
                                                                        key={`rem-t-${sId}-${t.id}`}
                                                                        onClick={() => handleToggleRemoval(`rem-top-${sId}-${t.id}`)}
                                                                        className={`relative flex items-start gap-3 p-3 rounded-xl border transition-all duration-300 text-left ${
                                                                            isSelected
                                                                            ? 'bg-rose-500/10 border-rose-500/30'
                                                                            : 'bg-zinc-800/30 border-white/5 hover:border-white/10'
                                                                        }`}
                                                                    >
                                                                        <div className={`mt-0.5 w-4 h-4 rounded-md flex items-center justify-center border-2 transition-all duration-300 shrink-0 ${
                                                                            isSelected
                                                                            ? 'bg-rose-500 border-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                                                                            : 'border-white/10 text-transparent'
                                                                        }`}>
                                                                            <Check size={10} strokeWidth={4} />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <span className={`text-[11px] font-bold text-white block truncate ${isSelected ? 'line-through decoration-rose-500/50' : ''}`}>{t.name}</span>
                                                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded-md border border-white/5">Remover Tópico</span>
                                                                                {studied && (
                                                                                    <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                                                                                        <AlertCircle size={9} className="text-amber-500" />
                                                                                        <span className="text-[7px] text-amber-500 font-black uppercase tracking-wider">Estudado</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer with Glass Effect */}
                    <div className="p-6 border-t border-white/5 bg-white/5 backdrop-blur-md flex gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 h-12 bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all border border-transparent hover:border-white/10"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!hasChanges || isApplying}
                            className="flex-[2] h-12 relative overflow-hidden group bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center gap-3 active:scale-95"
                        >
                            {isApplying ? (
                                <RefreshCw className="animate-spin" size={18} />
                            ) : (
                                <>
                                    <Check size={18} strokeWidth={3} />
                                    <span>Aplicar Alterações</span>
                                </>
                            )}
                            {/* Hover Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                        </button>
                    </div>
                </motion.div>

                {/* Inline CSS for necessary high-quality animations not in Tailwind */}
                <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes shimmer {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(100%); }
                    }
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(255, 255, 255, 0.1);
                    }
                ` }} />
            </div>
        </AnimatePresence>
    );
};
