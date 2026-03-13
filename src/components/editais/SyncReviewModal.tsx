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
            const ssName = (ss.name || (ss as any).title || '').trim().toUpperCase();
            if (!ssName) return;

            const local = localSubjects.find(ls => (ls.name || '').trim().toUpperCase() === ssName);

            if (!local) {
                additions.subjects.push(ss);
            } else {
                // Matéria existe, ver tópicos
                const newTopics = (ss.topics || []).filter((st: Topic | string) => {
                    const stName = (typeof st === 'string' ? st : (st.name || '')).trim().toUpperCase();
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

            const inSource = sourceSubjects.some(ss => (ss.name || (ss as any).title || '').trim().toUpperCase() === lsName);
            if (!inSource) {
                removals.subjects.push(ls);
            } else {
                const ss = sourceSubjects.find(ss => (ss.name || (ss as any).title || '').trim().toUpperCase() === lsName);
                if (!ss) return;
                const removedTopics = (ls.topics || []).filter(lt => {
                    const ltName = (lt.name || '').trim().toUpperCase();
                    if (!ltName) return false;

                    const stillInSource = (ss.topics || []).some((st: any) => 
                        (typeof st === 'string' ? st : (st.name || '')).trim().toUpperCase() === ltName
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
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                >
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/30">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                                <RefreshCw className="text-primary" size={18} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-white tracking-tight">Revisar Atualizações</h2>
                                <p className="text-[10px] text-zinc-500 font-medium">{editalName}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
                            <X size={18} className="text-zinc-500" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 overflow-y-auto space-y-6">
                        {!hasChanges ? (
                            <div className="text-center py-10">
                                <Check className="mx-auto text-emerald-500 mb-3" size={40} />
                                <p className="text-sm text-zinc-400 font-medium">Seu edital já está totalmente sincronizado!</p>
                            </div>
                        ) : (
                            <>
                                {/* Inclusões */}
                                {(diff.additions.subjects.length > 0 || Object.keys(diff.additions.topics).length > 0) && (
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 px-1">
                                            <Plus size={12} /> Adicionado no edital
                                        </h3>
                                        
                                        <div className="grid gap-2">
                                            {diff.additions.subjects.map((s, i) => {
                                                const sName = s.name || (s as any).title;
                                                return (
                                                    <React.Fragment key={`add-s-group-${i}`}>
                                                        {/* Card da Matéria */}
                                                        <button
                                                            onClick={() => handleToggleAddition(`subj-${s.id || s.name}`)}
                                                            className={`flex items-start gap-3 p-3 rounded-2xl border transition-all text-left ${
                                                                selectedAdditions.has(`subj-${s.id || s.name}`)
                                                                ? 'bg-emerald-500/10 border-emerald-500/20'
                                                                : 'bg-white/5 border-white/5 hover:border-white/10'
                                                            }`}
                                                        >
                                                            <div className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center border shrink-0 ${
                                                                selectedAdditions.has(`subj-${s.id || s.name}`)
                                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                                : 'border-white/20 text-transparent'
                                                            }`}>
                                                                <Check size={12} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <span className="text-sm font-bold text-white block truncate">{sName}</span>
                                                                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                                                                    Nova Matéria
                                                                </span>
                                                            </div>
                                                        </button>

                                                        {/* Cards dos Tópicos que vêm com a matéria nova */}
                                                        {s.topics && s.topics.length > 0 && s.topics.map((t, idx) => (
                                                            <button
                                                                key={`add-s-${i}-t-${idx}`}
                                                                onClick={() => handleToggleAddition(`subj-${s.id || s.name}-t-${idx}`)}
                                                                className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left ml-4 ${
                                                                    selectedAdditions.has(`subj-${s.id || s.name}-t-${idx}`)
                                                                    ? 'bg-emerald-500/10 border-emerald-500/20'
                                                                    : 'bg-white/5 border-white/5 hover:border-white/10'
                                                                }`}
                                                            >
                                                                <div className={`w-5 h-5 rounded-lg flex items-center justify-center border shrink-0 ${
                                                                    selectedAdditions.has(`subj-${s.id || s.name}-t-${idx}`)
                                                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                                                    : 'border-white/20 text-transparent'
                                                                }`}>
                                                                    <Check size={12} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <span className="text-xs font-medium text-white block truncate">
                                                                        {typeof t === 'string' ? t : t.name}
                                                                    </span>
                                                                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                                                                        Tópico incluído na matéria <span className="text-zinc-400">{sName}</span>
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </React.Fragment>
                                                );
                                            })}

                                            {Object.entries(diff.additions.topics).map(([sId, topics]) => {
                                                const subj = localSubjects.find(ls => ls.id === sId);
                                                return topics.map((t, i) => (
                                                    <button
                                                        key={`add-t-${sId}-${i}`}
                                                        onClick={() => handleToggleAddition(`top-${sId}-${i}`)}
                                                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left ${
                                                            selectedAdditions.has(`top-${sId}-${i}`)
                                                            ? 'bg-emerald-500/10 border-emerald-500/20'
                                                            : 'bg-white/5 border-white/5 hover:border-white/10'
                                                        }`}
                                                    >
                                                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center border shrink-0 ${
                                                            selectedAdditions.has(`top-${sId}-${i}`)
                                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                                            : 'border-white/20 text-transparent'
                                                        }`}>
                                                            <Check size={12} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-xs font-medium text-white block truncate">{typeof t === 'string' ? t : (t as any).name}</span>
                                                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                                                                Tópico incluído na matéria <span className="text-zinc-400">{subj?.name}</span>
                                                            </span>
                                                        </div>
                                                    </button>
                                                ));
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Remoções */}
                                {(diff.removals.subjects.length > 0 || Object.keys(diff.removals.topics).length > 0) && (
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2 px-1">
                                            <Trash2 size={12} /> Removidos do edital
                                        </h3>
                                        
                                        <div className="grid gap-2">
                                            {diff.removals.subjects.map((s) => {
                                                const hasProgress = s.topics.some(t => t.completed || t.review_count > 0);
                                                return (
                                                    <button
                                                        key={`rem-s-${s.id}`}
                                                        onClick={() => handleToggleRemoval(`rem-subj-${s.id}`)}
                                                        className={`flex items-start gap-3 p-3 rounded-2xl border transition-all text-left ${
                                                            selectedRemovals.has(`rem-subj-${s.id}`)
                                                            ? 'bg-rose-500/10 border-rose-500/20'
                                                            : 'bg-white/5 border-white/5 hover:border-white/10'
                                                        }`}
                                                    >
                                                        <div className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center border shrink-0 ${
                                                            selectedRemovals.has(`rem-subj-${s.id}`)
                                                            ? 'bg-rose-500 border-rose-500 text-white'
                                                            : 'border-white/20 text-transparent'
                                                        }`}>
                                                            <Check size={12} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-sm font-bold text-white block truncate">{s.name}</span>
                                                            <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">
                                                                Matéria removida
                                                            </span>
                                                            {hasProgress && (
                                                                <span className="text-[8px] text-amber-500 font-black uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-full inline-block mt-1">
                                                                    Possui Progresso
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}

                                            {Object.entries(diff.removals.topics).map(([sId, topics]) => {
                                                const subj = localSubjects.find(ls => ls.id === sId);
                                                return topics.map((t) => (
                                                    <button
                                                        key={`rem-t-${sId}-${t.id}`}
                                                        onClick={() => handleToggleRemoval(`rem-top-${sId}-${t.id}`)}
                                                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left ${
                                                            selectedRemovals.has(`rem-top-${sId}-${t.id}`)
                                                            ? 'bg-rose-500/10 border-rose-500/20'
                                                            : 'bg-white/5 border-white/5 hover:border-white/10'
                                                        }`}
                                                    >
                                                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center border shrink-0 ${
                                                            selectedRemovals.has(`rem-top-${sId}-${t.id}`)
                                                            ? 'bg-rose-500 border-rose-500 text-white'
                                                            : 'border-white/20 text-transparent'
                                                        }`}>
                                                            <Check size={12} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-xs font-medium text-white block truncate">{t.name}</span>
                                                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                                                                Tópico da matéria <span className="text-zinc-400">{subj?.name}</span> foi removido
                                                            </span>
                                                            {(t.completed || t.review_count > 0) && (
                                                                <span className="text-[8px] text-amber-500 font-bold uppercase tracking-wider block mt-1">
                                                                    Estudado em {subj?.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>
                                                ));
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/5 bg-zinc-900/30 flex gap-2">
                        <button
                            onClick={onClose}
                            className="flex-1 h-10 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!hasChanges || isApplying}
                            className="flex-[2] h-10 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            {isApplying ? (
                                <RefreshCw className="animate-spin" size={16} />
                            ) : (
                                <Check size={16} />
                            )}
                            Aplicar Alterações
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
